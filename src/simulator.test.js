import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleProgram,
  createDefaultGraph,
  initialRuntime,
  parseInitialState,
  stepCircuit,
} from "./simulator.js";

const BASE_PC = 0x00400000;

function setup(source, registers = "", memory = "", graph = createDefaultGraph()) {
  const initial = parseInitialState(`0x${BASE_PC.toString(16)}`, registers, memory);
  const program = assembleProgram(source, initial.pc);
  return { graph, program, runtime: initialRuntime(initial) };
}

function step(state) {
  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.equal(result.error, undefined, result.error);
  assert.equal(result.done, undefined, result.reason);
  state.runtime = result.runtime;
  return result;
}

function nodeOfType(graph, type, index = 0) {
  const node = graph.nodes.filter((candidate) => candidate.type === type)[index];
  assert.ok(node, `Falta el componente ${type} en el datapath.`);
  return node;
}

function wireBetween(graph, from, fromPort, to, toPort) {
  const wire = graph.wires.find((candidate) => candidate.from === from && candidate.fromPort === fromPort && candidate.to === to && candidate.toPort === toPort);
  assert.ok(wire, `Falta el cable ${from}.${fromPort} → ${to}.${toPort}.`);
  return wire;
}

test("add: la palabra binaria se decodifica y la ruta escribe el resultado", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  const instruction = state.program.instructions[0];
  const expectedWord = 0x01095020;
  assert.equal(instruction.encoding, expectedWord);
  assert.equal(instruction.encoding.toString(2).padStart(32, "0"), "00000001000010010101000000100000");

  const result = step(state);
  const fields = nodeOfType(state.graph, "fields");
  const alu = nodeOfType(state.graph, "alu");
  const registers = state.graph.roles.registerFile;
  const pcNode = state.graph.roles.pc;
  const writebackMux = nodeOfType(state.graph, "mux2", 2);
  const decoded = result.nodeSignals[fields.id].outputs;

  assert.deepEqual(
    { opcode: decoded.opcode, rs: decoded.rs, rt: decoded.rt, rd: decoded.rd, funct: decoded.funct },
    { opcode: 0, rs: 8, rt: 9, rd: 10, funct: 32 },
  );
  assert.equal(result.nodeSignals[alu.id].outputs.result, 12);
  assert.equal(result.nodeSignals[registers].inputs.regWrite, 1);
  assert.equal(result.registerWrite.register, 10);
  assert.equal(result.registerWrite.value, 12);
  assert.equal(state.runtime.registers[10], 12);
  assert.equal(state.runtime.pc, BASE_PC + 4);
  assert.equal(state.runtime.cycles, 1);

  const fetchWire = wireBetween(state.graph, pcNode, "value", state.graph.roles.instructionMemory, "address");
  const writebackWire = wireBetween(state.graph, writebackMux.id, "value", registers, "writeData");
  assert.equal(result.wireValues[fetchWire.id], BASE_PC);
  assert.equal(result.wireValues[writebackWire.id], 12);
  assert.ok(result.activeWires.has(fetchWire.id));
  assert.ok(result.activeWires.has(writebackWire.id));
});

test("sub, and, or y slt ejecutan sus operaciones de ALU", () => {
  const state = setup(
    "sub $t2, $t0, $t1\nand $t3, $t0, $t1\nor $t4, $t0, $t1\nslt $t5, $t0, $t1",
    "$t0 = 7\n$t1 = 5",
  );
  for (let index = 0; index < 4; index += 1) step(state);

  assert.equal(state.runtime.registers[10], 2);
  assert.equal(state.runtime.registers[11], 5);
  assert.equal(state.runtime.registers[12], 7);
  assert.equal(state.runtime.registers[13], 0);
  assert.equal(state.runtime.pc, BASE_PC + 16);
  assert.equal(state.runtime.cycles, 4);
});

test("slt compara operandos como enteros con signo", () => {
  const state = setup("slt $t2, $t0, $t1", "$t0 = -7\n$t1 = 5");
  step(state);
  assert.equal(state.runtime.registers[10], 1);
});

test("addi extiende el inmediato negativo con signo", () => {
  const state = setup("addi $t2, $t0, -3", "$t0 = 7");
  const result = step(state);
  assert.equal(result.nodeSignals[nodeOfType(state.graph, "signExtend").id].outputs.extended, 0xfffffffd);
  assert.equal(state.runtime.registers[10], 4);
});

test("lw lee una palabra de una dirección de byte alineada", () => {
  const state = setup("lw $t2, 4($t0)", "$t0 = 0x10010000", "0x10010004 = 42");
  const result = step(state);
  assert.equal(result.registerWrite.register, 10);
  assert.equal(state.runtime.registers[10], 42);
});

test("sw escribe una palabra en memoria y reporta la dirección", () => {
  const state = setup("sw $t1, 8($t0)", "$t0 = 0x10010000\n$t1 = 0x12345678");
  const result = step(state);
  assert.deepEqual(result.memoryWrite, { address: 0x10010008, value: 0x12345678 });
  assert.equal(state.runtime.memory[0x10010008], 0x12345678);
});

test("lw desalineado informa un error y no modifica registros ni ciclos", () => {
  const state = setup("lw $t2, 1($t0)", "$t0 = 0x10010000\n$t2 = 9", "0x10010000 = 42");
  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /desalinead/i);
  assert.equal(state.runtime.registers[10], 9);
  assert.equal(state.runtime.cycles, 0);
});

test("sw desalineado informa un error y no modifica memoria ni ciclos", () => {
  const state = setup("sw $t1, 1($t0)", "$t0 = 0x10010000\n$t1 = 42", "0x10010000 = 9");
  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /desalinead/i);
  assert.equal(state.runtime.memory[0x10010000], 9);
  assert.equal(state.runtime.cycles, 0);
});

test("beq tomado salta a la etiqueta relativa a PC + 4", () => {
  const state = setup("beq $t0, $t1, destino\naddi $t2, $zero, 1\ndestino: addi $t2, $zero, 7", "$t0 = 4\n$t1 = 4");
  const result = step(state);
  assert.equal(result.nodeSignals[nodeOfType(state.graph, "branchAnd").id].outputs.taken, 1);
  assert.equal(state.runtime.pc, BASE_PC + 8);
  assert.equal(state.runtime.registers[10], 0);
});

test("beq no tomado continúa en la instrucción siguiente", () => {
  const state = setup("beq $t0, $t1, destino\naddi $t2, $zero, 1\ndestino: addi $t2, $zero, 7", "$t0 = 4\n$t1 = 5");
  const result = step(state);
  assert.equal(result.nodeSignals[nodeOfType(state.graph, "branchAnd").id].outputs.taken, 0);
  assert.equal(state.runtime.pc, BASE_PC + 4);
  step(state);
  assert.equal(state.runtime.registers[10], 1);
});

test("j forma una dirección alineada en la misma región de PC + 4", () => {
  const state = setup("j destino\naddi $t2, $zero, 1\ndestino: addi $t2, $zero, 7");
  const result = step(state);
  assert.equal(result.instruction.encoding >>> 26, 2);
  assert.equal(state.runtime.pc, BASE_PC + 8);
  assert.equal(state.runtime.registers[10], 0);
});

test("una entrada esencial sin conexión detiene la simulación", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  const source = nodeOfType(state.graph, "control");
  const target = state.graph.nodes.find((node) => node.id === state.graph.roles.registerFile);
  const wire = wireBetween(state.graph, source.id, "regWrite", target.id, "regWrite");
  state.graph.wires = state.graph.wires.filter((candidate) => candidate.id !== wire.id);

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /conexi[oó]n|señal/i);
});

test("una conexión con anchuras incompatibles se rechaza", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  const control = nodeOfType(state.graph, "control");
  state.graph.wires.push({
    id: "qa-invalid-width",
    from: control.id,
    fromPort: "regWrite",
    to: state.graph.roles.registerFile,
    toPort: "writeData",
  });

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /anchuras incompatibles|no coincide/i);
});

test("dos señales conectadas a la misma entrada se rechazan", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  state.graph.wires.push({
    id: "qa-second-driver",
    from: state.graph.roles.instructionMemory,
    fromPort: "instruction",
    to: state.graph.roles.pc,
    toPort: "next",
  });

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /más de una señal|más de un/i);
});

test("una conexión que apunta a un componente inexistente se rechaza", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  state.graph.wires.push({
    id: "qa-missing-node",
    from: "componente-inexistente",
    fromPort: "value",
    to: state.graph.roles.pc,
    toPort: "next",
  });

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /apunta a un bloque que ya no existe/i);
});

test("una conexión que usa un puerto de salida desconocido se rechaza", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  const wire = wireBetween(state.graph, state.graph.roles.pc, "value", state.graph.roles.instructionMemory, "address");
  wire.fromPort = "salida-inexistente";

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /salida desconocida/i);
});

test("una conexión que usa un puerto de entrada desconocido se rechaza", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  const wire = wireBetween(state.graph, state.graph.roles.pc, "value", state.graph.roles.instructionMemory, "address");
  wire.toPort = "entrada-inexistente";

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /entrada desconocida/i);
});

test("un rol asignado a un tipo de componente incorrecto se rechaza", () => {
  const state = setup("add $t2, $t0, $t1", "$t0 = 7\n$t1 = 5");
  state.graph.roles.pc = state.graph.roles.instructionMemory;

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /asignado como.*contador de programa.*tipo correcto/i);
});

test("un opcode MIPS conocido pero no admitido por control da error localizado sin cambiar estado", () => {
  const state = setup("addi $t2, $zero, 1", "$t2 = 9");
  const instruction = state.program.instructions[0];
  instruction.encoding = (9 << 26) >>> 0; // slti, opcode MIPS válido fuera del subconjunto.
  const runtimeBefore = {
    pc: state.runtime.pc,
    registers: [...state.runtime.registers],
    memory: { ...state.runtime.memory },
    cycles: state.runtime.cycles,
  };

  const result = stepCircuit(state.graph, state.program, state.runtime);
  assert.match(result.error || "", /Unidad de control.*no puede producir una señal válida/i);
  assert.deepEqual(state.runtime, runtimeBefore);
});
