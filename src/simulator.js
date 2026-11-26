export const NODE_WIDTH = 260;
const u32 = (value) => Number(value) >>> 0;

export const PORTS = {
  pc: { inputs: [{ id: "next", label: "siguiente PC", width: 32 }], outputs: [{ id: "value", label: "PC", width: 32 }] },
  instructionMemory: { inputs: [{ id: "address", label: "dirección", width: 32 }], outputs: [{ id: "instruction", label: "instrucción", width: 32 }] },
  fields: {
    inputs: [{ id: "instruction", label: "instrucción", width: 32 }],
    outputs: [
      { id: "opcode", label: "op", width: 6 }, { id: "rs", label: "rs", width: 5 },
      { id: "rt", label: "rt", width: 5 }, { id: "rd", label: "rd", width: 5 },
      { id: "immediate", label: "inmediato", width: 16 }, { id: "funct", label: "funct", width: 6 },
      { id: "jumpIndex", label: "índice salto", width: 26 },
    ],
  },
  registerFile: {
    inputs: [
      { id: "readRs", label: "registro rs", width: 5 }, { id: "readRt", label: "registro rt", width: 5 },
      { id: "writeRegister", label: "registro escritura", width: 5 }, { id: "writeData", label: "dato escritura", width: 32 },
      { id: "regWrite", label: "RegWrite", width: 1 },
    ],
    outputs: [{ id: "readData1", label: "dato 1", width: 32 }, { id: "readData2", label: "dato 2", width: 32 }],
  },
  control: {
    inputs: [{ id: "opcode", label: "op", width: 6 }],
    outputs: [
      { id: "regDst", label: "RegDst", width: 1 }, { id: "aluSrc", label: "ALUSrc", width: 1 },
      { id: "memToReg", label: "MemtoReg", width: 1 }, { id: "regWrite", label: "RegWrite", width: 1 },
      { id: "memRead", label: "MemRead", width: 1 }, { id: "memWrite", label: "MemWrite", width: 1 },
      { id: "branch", label: "Branch", width: 1 }, { id: "jump", label: "Jump", width: 1 },
      { id: "aluOp", label: "ALUOp", width: 2 },
    ],
  },
  aluControl: {
    inputs: [{ id: "aluOp", label: "ALUOp", width: 2 }, { id: "funct", label: "funct", width: 6 }],
    outputs: [{ id: "operation", label: "operación", width: 4 }],
  },
  mux2: {
    inputs: [
      { id: "a", label: "entrada A", width: "config" }, { id: "b", label: "entrada B", width: "config" },
      { id: "select", label: "selección", width: 1 },
    ],
    outputs: [{ id: "value", label: "salida", width: "config" }],
  },
  adder: { inputs: [{ id: "a", label: "sumando A", width: 32 }, { id: "b", label: "sumando B", width: 32 }], outputs: [{ id: "sum", label: "suma", width: 32 }] },
  signExtend: { inputs: [{ id: "value", label: "inmediato", width: 16 }], outputs: [{ id: "extended", label: "extendido", width: 32 }] },
  shiftLeft2: { inputs: [{ id: "value", label: "entrada", width: 32 }], outputs: [{ id: "shifted", label: "desplazado", width: 32 }] },
  alu: {
    inputs: [{ id: "a", label: "operando A", width: 32 }, { id: "b", label: "operando B", width: 32 }, { id: "operation", label: "ALUControl", width: 4 }],
    outputs: [{ id: "result", label: "resultado", width: 32 }, { id: "zero", label: "Zero", width: 1 }],
  },
  branchAnd: { inputs: [{ id: "branch", label: "Branch", width: 1 }, { id: "zero", label: "Zero", width: 1 }], outputs: [{ id: "taken", label: "tomar rama", width: 1 }] },
  jumpTarget: { inputs: [{ id: "index", label: "índice", width: 26 }, { id: "pcPlus4", label: "PC + 4", width: 32 }], outputs: [{ id: "target", label: "destino", width: 32 }] },
  dataMemory: {
    inputs: [
      { id: "address", label: "dirección", width: 32 }, { id: "writeData", label: "dato escritura", width: 32 },
      { id: "memRead", label: "MemRead", width: 1 }, { id: "memWrite", label: "MemWrite", width: 1 },
    ],
    outputs: [{ id: "readData", label: "dato leído", width: 32 }],
  },
  constant: { inputs: [], outputs: [{ id: "value", label: "constante", width: "config" }] },
};

export const NODE_INFO = {
  pc: { title: "Contador de programa (PC)", icon: "PC", color: "violet", description: "Guarda la dirección de la instrucción actual. Al final del ciclo recibe la dirección de la siguiente instrucción.", instructions: "Participa en todas las instrucciones." },
  instructionMemory: { title: "Memoria de instrucciones", icon: "ROM", color: "blue", description: "Busca la instrucción situada en la dirección que entrega el PC.", instructions: "Entrega cualquiera de las instrucciones cargadas." },
  fields: { title: "Campos de instrucción", icon: "IR", color: "cyan", description: "Separa la palabra de instrucción en opcode, registros, inmediato, función e índice de salto.", instructions: "Permite decodificar las diez instrucciones del simulador." },
  registerFile: { title: "Banco de registros", icon: "REG", color: "teal", description: "Lee dos registros y puede escribir un resultado en un tercer registro. El registro $zero siempre contiene cero.", instructions: "Lee operandos de instrucciones R, addi, lw, sw y beq; escribe resultados cuando RegWrite está activo." },
  control: { title: "Unidad de control", icon: "CTRL", color: "orange", description: "Interpreta el opcode y activa las señales que dirigen la ruta de datos.", instructions: "Selecciona el recorrido para add, sub, and, or, slt, addi, lw, sw, beq y j." },
  aluControl: { title: "Control de la ALU", icon: "ALU C", color: "orange", description: "Convierte ALUOp y el campo funct en la operación concreta de la ALU.", instructions: "Selecciona suma, resta, AND, OR o comparación con signo." },
  mux2: { title: "Multiplexor 2:1", icon: "MUX", color: "pink", description: "Deja pasar una de dos entradas. La señal de selección elige A cuando vale 0 y B cuando vale 1.", instructions: "Se usa para escoger registro destino, operando, dato de escritura o siguiente PC." },
  adder: { title: "Sumador de 32 bits", icon: "ADD", color: "blue", description: "Suma dos valores de 32 bits y entrega el resultado al siguiente bloque.", instructions: "Calcula PC + 4 y destinos de rama." },
  signExtend: { title: "Extensión de signo", icon: "SEXT", color: "cyan", description: "Amplía el inmediato de 16 a 32 bits conservando su signo.", instructions: "Se usa en addi, lw, sw y beq." },
  shiftLeft2: { title: "Desplazador a la izquierda", icon: "<< 2", color: "cyan", description: "Desplaza el valor dos posiciones a la izquierda, equivalente a multiplicarlo por cuatro.", instructions: "Alinea el desplazamiento de una rama a una dirección de palabra." },
  alu: { title: "Unidad aritmético-lógica (ALU)", icon: "ALU", color: "amber", description: "Realiza operaciones aritméticas y lógicas con dos operandos y genera la condición Zero.", instructions: "Ejecuta add, sub, and, or, slt, addi, lw, sw y la comparación de beq." },
  branchAnd: { title: "Lógica de rama", icon: "AND", color: "pink", description: "Activa el salto condicional cuando Branch y Zero valen 1.", instructions: "Decide si beq usa la dirección de destino." },
  jumpTarget: { title: "Formador de destino de salto", icon: "JUMP", color: "violet", description: "Combina el índice de 26 bits con los cuatro bits superiores de PC + 4 y añade dos ceros.", instructions: "Calcula el destino de j." },
  dataMemory: { title: "Memoria de datos", icon: "RAM", color: "green", description: "Lee o escribe palabras de 32 bits usando direcciones de byte alineadas a cuatro bytes.", instructions: "Se activa con lw para leer y con sw para escribir." },
  constant: { title: "Constante", icon: "K", color: "slate", description: "Entrega un valor fijo configurable al resto del circuito.", instructions: "Puede usarse para valores como 4 en PC + 4." },
};

export const PALETTE = [
  ["pc", "PC"], ["instructionMemory", "Memoria de instrucciones"], ["fields", "Campos de instrucción"],
  ["registerFile", "Banco de registros"], ["control", "Unidad de control"], ["aluControl", "Control de ALU"],
  ["mux2", "Multiplexor 2:1"], ["adder", "Sumador"], ["signExtend", "Extensión de signo"],
  ["shiftLeft2", "Desplazador << 2"], ["alu", "ALU"], ["branchAnd", "Lógica AND de rama"],
  ["jumpTarget", "Formador de salto"], ["dataMemory", "Memoria de datos"], ["constant", "Constante"],
];

let nextNodeId = 1;
let nextWireId = 1;
const nodeId = (prefix) => `${prefix}-${nextNodeId++}`;
const wireId = () => `wire-${nextWireId++}`;

export function createNode(type, x = 80, y = 80, extra = {}) {
  const defaults = { mux2: { width: 32 }, constant: { width: 32, value: 4 } };
  const config = { ...(defaults[type] || {}), ...(extra.config || {}) };
  const info = NODE_INFO[type];
  return { id: nodeId(type), type, name: extra.name || info?.title || type, x, y, config };
}

export function widthOf(node, port) {
  const spec = [...(PORTS[node.type]?.inputs || []), ...(PORTS[node.type]?.outputs || [])].find((item) => item.id === port);
  return spec?.width === "config" ? Number(node.config?.width || 32) : spec?.width;
}

export function createDefaultGraph() {
  nextNodeId = 1;
  nextWireId = 1;
  const nodes = [
    createNode("pc", 40, 430),
    createNode("instructionMemory", 340, 390),
    createNode("fields", 640, 390),
    createNode("control", 640, 40),
    createNode("registerFile", 950, 410),
    createNode("mux2", 1110, 180, { name: "MUX · registro destino", config: { width: 5 } }),
    createNode("signExtend", 1100, 760),
    createNode("shiftLeft2", 1370, 800),
    createNode("aluControl", 1370, 550),
    createNode("mux2", 1400, 340, { name: "MUX · operando ALU", config: { width: 32 } }),
    createNode("alu", 1690, 380),
    createNode("dataMemory", 1990, 400),
    createNode("mux2", 2260, 260, { name: "MUX · dato de escritura", config: { width: 32 } }),
    createNode("adder", 340, 790, { name: "Sumador · PC + 4" }),
    createNode("constant", 80, 830, { name: "Constante · 4", config: { width: 32, value: 4 } }),
    createNode("adder", 1690, 810, { name: "Sumador · destino de rama" }),
    createNode("branchAnd", 1990, 790),
    createNode("mux2", 2260, 560, { name: "MUX · rama", config: { width: 32 } }),
    createNode("jumpTarget", 1990, 40),
    createNode("mux2", 2560, 470, { name: "MUX · siguiente PC", config: { width: 32 } }),
  ];
  const byName = Object.fromEntries(nodes.map((node) => [node.name, node.id]));
  const byType = (type, index = 0) => nodes.filter((node) => node.type === type)[index].id;
  const pc = byType("pc");
  const imem = byType("instructionMemory");
  const fields = byType("fields");
  const control = byType("control");
  const regs = byType("registerFile");
  const regMux = byType("mux2", 0);
  const sign = byType("signExtend");
  const shift = byType("shiftLeft2");
  const aluControl = byType("aluControl");
  const aluMux = byType("mux2", 1);
  const alu = byType("alu");
  const memory = byType("dataMemory");
  const wbMux = byType("mux2", 2);
  const pc4 = byType("adder", 0);
  const four = byType("constant");
  const branchAdder = byType("adder", 1);
  const branchAnd = byType("branchAnd");
  const branchMux = byType("mux2", 3);
  const jump = byType("jumpTarget");
  const nextMux = byType("mux2", 4);
  const edges = [
    [pc, "value", imem, "address"], [pc, "value", pc4, "a"], [four, "value", pc4, "b"],
    [imem, "instruction", fields, "instruction"], [fields, "opcode", control, "opcode"],
    [fields, "rs", regs, "readRs"], [fields, "rt", regs, "readRt"],
    [fields, "rt", regMux, "a"], [fields, "rd", regMux, "b"], [control, "regDst", regMux, "select"],
    [regMux, "value", regs, "writeRegister"], [regs, "readData1", alu, "a"], [regs, "readData2", aluMux, "a"],
    [regs, "readData2", memory, "writeData"], [fields, "immediate", sign, "value"],
    [sign, "extended", aluMux, "b"], [control, "aluSrc", aluMux, "select"], [aluMux, "value", alu, "b"],
    [control, "aluOp", aluControl, "aluOp"], [fields, "funct", aluControl, "funct"],
    [aluControl, "operation", alu, "operation"], [alu, "result", memory, "address"],
    [control, "memRead", memory, "memRead"], [control, "memWrite", memory, "memWrite"],
    [alu, "result", wbMux, "a"], [memory, "readData", wbMux, "b"],
    [control, "memToReg", wbMux, "select"], [wbMux, "value", regs, "writeData"],
    [control, "regWrite", regs, "regWrite"], [sign, "extended", shift, "value"],
    [pc4, "sum", branchAdder, "a"], [shift, "shifted", branchAdder, "b"],
    [control, "branch", branchAnd, "branch"], [alu, "zero", branchAnd, "zero"],
    [pc4, "sum", branchMux, "a"], [branchAdder, "sum", branchMux, "b"], [branchAnd, "taken", branchMux, "select"],
    [fields, "jumpIndex", jump, "index"], [pc4, "sum", jump, "pcPlus4"],
    [branchMux, "value", nextMux, "a"], [jump, "target", nextMux, "b"],
    [control, "jump", nextMux, "select"], [nextMux, "value", pc, "next"],
  ];
  return {
    nodes,
    wires: edges.map(([from, fromPort, to, toPort]) => ({ id: wireId(), from, fromPort, to, toPort })),
    roles: { pc, instructionMemory: imem, registerFile: regs, dataMemory: memory },
  };
}

export function parseNumber(text) {
  const value = String(text ?? "").trim().replaceAll("_", "");
  if (!value) throw new Error("Falta un valor numérico.");
  let parsed;
  if (/^-?0x[\da-f]+$/i.test(value)) {
    const negative = value.startsWith("-");
    parsed = Number.parseInt(value.replace(/^-?0x/i, ""), 16) * (negative ? -1 : 1);
  } else if (/^-?0b[01]+$/i.test(value)) {
    const negative = value.startsWith("-");
    parsed = Number.parseInt(value.replace(/^-?0b/i, ""), 2) * (negative ? -1 : 1);
  } else {
    parsed = Number(value);
  }
  if (!Number.isSafeInteger(parsed)) throw new Error(`«${text}» no es un entero válido.`);
  return parsed;
}

const REGISTERS = (() => {
  const names = [
    "zero", "at", "v0", "v1", "a0", "a1", "a2", "a3", "t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7",
    "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "t8", "t9", "k0", "k1", "gp", "sp", "fp", "ra",
  ];
  const map = new Map();
  names.forEach((name, index) => map.set(`$${name}`, index));
  map.set("$s8", 30);
  for (let index = 0; index < 32; index += 1) map.set(`$${index}`, index);
  return map;
})();

function parseRegister(value, line) {
  const register = REGISTERS.get(value.trim().toLowerCase());
  if (register === undefined) throw new Error(`Línea ${line}: registro no reconocido «${value.trim()}».`);
  return register;
}

function signedImmediate(value, line) {
  let parsed;
  try {
    parsed = parseNumber(value);
  } catch (error) {
    throw new Error(`Línea ${line}: inmediato no válido. ${error.message}`);
  }
  if (parsed < -32768 || parsed > 32767) throw new Error(`Línea ${line}: el inmediato debe estar entre -32768 y 32767.`);
  return parsed & 0xffff;
}

export function assembleProgram(source, startAddress) {
  const lines = String(source || "").split(/\r?\n/);
  const labels = new Map();
  const instructions = [];
  let address = u32(startAddress);
  if ((address & 3) !== 0) throw new Error("El PC inicial del programa debe estar alineado a 4 bytes.");

  lines.forEach((raw, index) => {
    let text = raw.replace(/#.*/, "").replace(/;.*/, "").trim();
    if (!text) return;
    const labelPattern = /^([\w.$]+):/;
    let match = text.match(labelPattern);
    while (match) {
      if (labels.has(match[1])) throw new Error(`Línea ${index + 1}: etiqueta repetida «${match[1]}».`);
      labels.set(match[1], address);
      text = text.slice(match[0].length).trim();
      if (!text) return;
      match = text.match(labelPattern);
    }
    instructions.push({ line: index + 1, address, text });
    address = u32(address + 4);
  });

  const assembled = instructions.map(({ line, address: pc, text }) => {
    const [mnemonicRaw, ...operandParts] = text.split(/\s+/);
    const mnemonic = mnemonicRaw.toLowerCase();
    const operands = operandParts.join(" ").split(",").map((part) => part.trim());
    const need = (count) => {
      if (operands.some((operand) => !operand)) throw new Error(`Línea ${line}: hay un operando vacío en ${mnemonic}.`);
      if (operands.length !== count) throw new Error(`Línea ${line}: ${mnemonic} requiere ${count} operandos.`);
    };
    let encoding = 0;
    let detail = { mnemonic, operands, sourceLine: line };
    if (["add", "sub", "and", "or", "slt"].includes(mnemonic)) {
      need(3);
      const [rd, rs, rt] = operands.map((operand) => parseRegister(operand, line));
      const funct = { add: 32, sub: 34, and: 36, or: 37, slt: 42 }[mnemonic];
      encoding = ((rs << 21) | (rt << 16) | (rd << 11) | funct) >>> 0;
      detail = { ...detail, rs, rt, rd };
    } else if (mnemonic === "addi") {
      need(3);
      const rt = parseRegister(operands[0], line);
      const rs = parseRegister(operands[1], line);
      const immediate = signedImmediate(operands[2], line);
      encoding = ((8 << 26) | (rs << 21) | (rt << 16) | immediate) >>> 0;
      detail = { ...detail, rs, rt, immediate };
    } else if (mnemonic === "lw" || mnemonic === "sw") {
      need(2);
      const rt = parseRegister(operands[0], line);
      const memoryOperand = operands[1].match(/^(-?(?:0x[\da-f_]+|0b[01_]+|\d[\d_]*))?\s*\(\s*(\$[\w]+)\s*\)$/i);
      if (!memoryOperand) throw new Error(`Línea ${line}: usa el formato ${mnemonic} $rt, desplazamiento($base).`);
      const rs = parseRegister(memoryOperand[2], line);
      const immediate = signedImmediate(memoryOperand[1] || "0", line);
      const opcode = mnemonic === "lw" ? 35 : 43;
      encoding = ((opcode << 26) | (rs << 21) | (rt << 16) | immediate) >>> 0;
      detail = { ...detail, rs, rt, immediate };
    } else if (mnemonic === "beq") {
      need(3);
      const rs = parseRegister(operands[0], line);
      const rt = parseRegister(operands[1], line);
      const target = labels.get(operands[2]);
      if (target === undefined) throw new Error(`Línea ${line}: no se encontró la etiqueta «${operands[2]}».`);
      const delta = (u32(target) - u32(pc + 4)) | 0;
      if (delta % 4 !== 0) throw new Error(`Línea ${line}: el destino de rama debe estar alineado a 4 bytes.`);
      const offset = delta / 4;
      if (offset < -32768 || offset > 32767) throw new Error(`Línea ${line}: el destino de rama está fuera de alcance.`);
      encoding = ((4 << 26) | (rs << 21) | (rt << 16) | (offset & 0xffff)) >>> 0;
      detail = { ...detail, rs, rt, immediate: offset & 0xffff, target };
    } else if (mnemonic === "j") {
      need(1);
      const target = labels.get(operands[0]);
      if (target === undefined) throw new Error(`Línea ${line}: no se encontró la etiqueta «${operands[0]}».`);
      if ((target & 3) !== 0 || (target >>> 28) !== (u32(pc + 4) >>> 28)) throw new Error(`Línea ${line}: el destino de j no es válido para esta región MIPS32.`);
      const index = (target >>> 2) & 0x03ffffff;
      encoding = ((2 << 26) | index) >>> 0;
      detail = { ...detail, index, target };
    } else {
      throw new Error(`Línea ${line}: instrucción «${mnemonicRaw}» no admitida.`);
    }
    return { address: pc, encoding, ...detail, text };
  });

  const byAddress = new Map(assembled.map((instruction) => [u32(instruction.address), instruction]));
  return { instructions: assembled, byAddress, startAddress: u32(startAddress), endAddress: u32(startAddress + assembled.length * 4) };
}

export function parseInitialState(pcText, registerText, memoryText) {
  const pc = u32(parseNumber(pcText));
  if ((pc & 3) !== 0) throw new Error("El PC inicial debe estar alineado a 4 bytes.");
  const registers = Array(32).fill(0);
  String(registerText || "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    const match = line.match(/^([^=\s]+)\s*=\s*(.+)$/);
    if (!match) throw new Error(`Registro, línea ${index + 1}: usa $t0 = 5.`);
    const register = parseRegister(match[1], index + 1);
    if (register === 0) throw new Error(`Registro, línea ${index + 1}: $zero siempre vale 0 y no se puede modificar.`);
    try {
      registers[register] = u32(parseNumber(match[2]));
    } catch (error) {
      throw new Error(`Registro, línea ${index + 1}: ${error.message}`);
    }
  });
  const memory = {};
  String(memoryText || "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    const match = line.match(/^([^=\s]+)\s*=\s*(.+)$/);
    if (!match) throw new Error(`Memoria, línea ${index + 1}: usa 0x10010000 = 12.`);
    let address;
    let value;
    try {
      address = u32(parseNumber(match[1]));
      value = u32(parseNumber(match[2]));
    } catch (error) {
      throw new Error(`Memoria, línea ${index + 1}: ${error.message}`);
    }
    if ((address & 3) !== 0) throw new Error(`Memoria, línea ${index + 1}: la dirección debe estar alineada a 4 bytes.`);
    memory[address] = value;
  });
  return { pc, registers, memory };
}

export function initialRuntime(initial) {
  return { pc: u32(initial.pc), registers: [...initial.registers], memory: { ...initial.memory }, cycles: 0 };
}

function portKey(nodeIdValue, port) { return `${nodeIdValue}.${port}`; }

function resolveWidth(node, port) { return widthOf(node, port); }

function sign16(value) { return ((value & 0xffff) << 16) >> 16; }

function controlSignals(opcode) {
  if (opcode == null) return null;
  const base = { regDst: 0, aluSrc: 0, memToReg: 0, regWrite: 0, memRead: 0, memWrite: 0, branch: 0, jump: 0, aluOp: 0 };
  if (opcode === 0) return { ...base, regDst: 1, regWrite: 1, aluOp: 2 };
  if (opcode === 35) return { ...base, aluSrc: 1, memToReg: 1, regWrite: 1, memRead: 1 };
  if (opcode === 43) return { ...base, aluSrc: 1, memWrite: 1 };
  if (opcode === 4) return { ...base, branch: 1, aluOp: 1 };
  if (opcode === 8) return { ...base, aluSrc: 1, regWrite: 1 };
  if (opcode === 2) return { ...base, jump: 1 };
  return null;
}

function aluOperation(aluOp, funct) {
  if (aluOp === 0) return 0;
  if (aluOp === 1) return 1;
  if (aluOp === 2) {
    const operations = { 32: 0, 34: 1, 36: 2, 37: 3, 42: 4 };
    return operations[funct] ?? null;
  }
  return null;
}

function requiredDependencyInputs(node) {
  if (node.type === "pc") return [];
  if (node.type === "registerFile") return ["readRs", "readRt"];
  if (node.type === "dataMemory") return ["address", "memRead"];
  return (PORTS[node.type]?.inputs || []).map((port) => port.id);
}

function isSequentialBoundaryInput(node, portId) {
  if (node.type === "pc") return portId === "next";
  if (node.type === "registerFile") return ["writeRegister", "writeData", "regWrite"].includes(portId);
  if (node.type === "dataMemory") return ["writeData", "memWrite"].includes(portId);
  return false;
}

function evaluateNode(node, input, context) {
  const out = {};
  const emit = (port, value) => { out[port] = value === undefined || value === null ? null : u32(value); };
  switch (node.type) {
    case "pc": emit("value", context.runtime.pc); break;
    case "instructionMemory": {
      const address = input("address");
      const instruction = address == null ? null : context.program.byAddress.get(u32(address));
      emit("instruction", instruction?.encoding ?? null);
      break;
    }
    case "fields": {
      const instruction = input("instruction");
      if (instruction == null) return Object.fromEntries(PORTS.fields.outputs.map((port) => [port.id, null]));
      const word = u32(instruction);
      emit("opcode", word >>> 26); emit("rs", (word >>> 21) & 31); emit("rt", (word >>> 16) & 31);
      emit("rd", (word >>> 11) & 31); emit("immediate", word & 0xffff); emit("funct", word & 63); emit("jumpIndex", word & 0x03ffffff);
      break;
    }
    case "registerFile": {
      const rs = input("readRs"); const rt = input("readRt");
      emit("readData1", rs == null ? null : context.runtime.registers[rs & 31]);
      emit("readData2", rt == null ? null : context.runtime.registers[rt & 31]);
      break;
    }
    case "control": {
      const controls = controlSignals(input("opcode"));
      if (controls) Object.assign(out, controls);
      else for (const port of PORTS.control.outputs) out[port.id] = null;
      break;
    }
    case "aluControl": emit("operation", aluOperation(input("aluOp"), input("funct"))); break;
    case "mux2": {
      const select = input("select");
      const value = select === 0 ? input("a") : select === 1 ? input("b") : null;
      emit("value", value);
      break;
    }
    case "adder": {
      const a = input("a"); const b = input("b");
      emit("sum", a == null || b == null ? null : u32(a + b));
      break;
    }
    case "signExtend": { const value = input("value"); emit("extended", value == null ? null : u32(sign16(value))); break; }
    case "shiftLeft2": { const value = input("value"); emit("shifted", value == null ? null : u32(value << 2)); break; }
    case "alu": {
      const a = input("a"); const b = input("b"); const operation = input("operation");
      let result = null;
      if (a != null && b != null && operation != null) {
        if (operation === 0) result = u32(a + b);
        if (operation === 1) result = u32(a - b);
        if (operation === 2) result = a & b;
        if (operation === 3) result = a | b;
        if (operation === 4) result = (a | 0) < (b | 0) ? 1 : 0;
      }
      emit("result", result); emit("zero", result == null ? null : result === 0 ? 1 : 0);
      break;
    }
    case "branchAnd": {
      const branch = input("branch"); const zero = input("zero");
      emit("taken", branch == null || zero == null ? null : (branch === 1 && zero === 1 ? 1 : 0));
      break;
    }
    case "jumpTarget": {
      const index = input("index"); const pc4 = input("pcPlus4");
      emit("target", index == null || pc4 == null ? null : (((pc4 & 0xf0000000) | ((index & 0x03ffffff) << 2)) >>> 0));
      break;
    }
    case "dataMemory": {
      const address = input("address"); const read = input("memRead");
      if (read === 0) emit("readData", 0);
      else if (read === 1 && address != null) emit("readData", context.runtime.memory[u32(address)] ?? 0);
      else emit("readData", null);
      break;
    }
    case "constant": emit("value", node.config.value); break;
    default: return out;
  }
  return out;
}

function formatAddress(address) { return `0x${u32(address).toString(16).padStart(8, "0")}`; }

function validateGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.wires)) {
    return "El circuito no tiene una lista válida de bloques y conexiones.";
  }
  const byId = new Map();
  for (const node of graph.nodes) {
    if (!node?.id || typeof node.id !== "string") return "Hay un bloque sin identificador válido.";
    if (byId.has(node.id)) return `Hay más de un bloque con el identificador «${node.id}».`;
    if (!PORTS[node.type]) return `El bloque «${node.name || node.id}» tiene un tipo desconocido.`;
    byId.set(node.id, node);
    if (["mux2", "constant"].includes(node.type)) {
      const width = Number(node.config?.width || 32);
      if (!Number.isInteger(width) || width < 1 || width > 32) {
        return `${node.name}: el ancho configurado debe ser un entero entre 1 y 32 bits.`;
      }
    }
  }

  const incoming = new Map();
  const wireIds = new Set();
  for (const wire of graph.wires) {
    if (!wire?.id || typeof wire.id !== "string") return "Hay una conexión sin identificador válido.";
    if (wireIds.has(wire.id)) return `Hay más de una conexión con el identificador «${wire.id}».`;
    wireIds.add(wire.id);
    const source = byId.get(wire.from);
    const target = byId.get(wire.to);
    if (!source || !target) return `La conexión ${wire.id} apunta a un bloque que ya no existe.`;
    const output = PORTS[source.type].outputs.find((port) => port.id === wire.fromPort);
    const input = PORTS[target.type].inputs.find((port) => port.id === wire.toPort);
    if (!output) return `La conexión ${wire.id} usa una salida desconocida en ${source.name}.`;
    if (!input) return `La conexión ${wire.id} usa una entrada desconocida en ${target.name}.`;
    const outWidth = resolveWidth(source, wire.fromPort);
    const inWidth = resolveWidth(target, wire.toPort);
    if (!Number.isInteger(outWidth) || outWidth < 1 || outWidth > 32) return `${source.name}.${output.label} tiene un ancho de señal no válido.`;
    if (!Number.isInteger(inWidth) || inWidth < 1 || inWidth > 32) return `${target.name}.${input.label} tiene un ancho de señal no válido.`;
    if (outWidth !== inWidth) {
      return `Conexión inválida: ${source.name}.${output.label} (${outWidth} bits) no coincide con ${target.name}.${input.label} (${inWidth} bits).`;
    }
    const key = portKey(target.id, wire.toPort);
    if (incoming.has(key)) return `La entrada ${target.name}.${input.label} recibe más de una señal.`;
    incoming.set(key, wire);
  }
  return { byId, incoming };
}

export function stepCircuit(graph, program, runtime) {
  if (!program?.instructions?.length) return { error: "Carga un programa ensamblador antes de iniciar la simulación." };
  if (!Array.isArray(program.instructions) || !(program.byAddress instanceof Map)) {
    return { error: "El programa ensamblado no tiene una tabla de instrucciones válida." };
  }
  const validation = validateGraph(graph);
  if (typeof validation === "string") return { error: validation };
  const { byId, incoming } = validation;

  if (!runtime || !Number.isFinite(runtime.pc) || !Number.isInteger(runtime.cycles)
    || !Array.isArray(runtime.registers) || runtime.registers.length !== 32
    || !runtime.memory || typeof runtime.memory !== "object") {
    return { error: "El estado inicial del simulador está incompleto o no es válido." };
  }

  const roles = graph.roles || {};
  const requiredRoles = {
    pc: ["pc", "contador de programa"],
    instructionMemory: ["instructionMemory", "memoria de instrucciones"],
    registerFile: ["registerFile", "banco de registros"],
    dataMemory: ["dataMemory", "memoria de datos"],
  };
  for (const [role, [type, label]] of Object.entries(requiredRoles)) {
    const node = byId.get(roles[role]);
    if (!node) return { error: `Falta el bloque principal «${label}».` };
    if (node.type !== type) return { error: `El bloque asignado como «${label}» no es del tipo correcto.` };
  }

  const sinkKeys = [
    portKey(roles.pc, "next"), portKey(roles.registerFile, "writeRegister"), portKey(roles.registerFile, "writeData"), portKey(roles.registerFile, "regWrite"),
    portKey(roles.dataMemory, "address"), portKey(roles.dataMemory, "writeData"), portKey(roles.dataMemory, "memWrite"),
  ];
  const active = new Set([roles.pc, roles.registerFile, roles.dataMemory]);
  const queue = [];
  for (const key of sinkKeys) {
    const wire = incoming.get(key);
    if (wire) queue.push(wire.from);
  }
  while (queue.length) {
    const id = queue.pop();
    if (active.has(id)) continue;
    const node = byId.get(id);
    if (!node) continue;
    active.add(id);
    for (const inputId of requiredDependencyInputs(node)) {
      const wire = incoming.get(portKey(id, inputId));
      if (wire) queue.push(wire.from);
    }
  }

  for (const id of active) {
    const node = byId.get(id);
    for (const port of PORTS[node.type]?.inputs || []) {
      if (!incoming.has(portKey(id, port.id))) return { error: `Falta una conexión en ${node.name}.${port.label}.` };
    }
  }

  const indegree = new Map([...active].map((id) => [id, 0]));
  const outgoing = new Map([...active].map((id) => [id, []]));
  for (const targetId of active) {
    const target = byId.get(targetId);
    for (const inputId of requiredDependencyInputs(target)) {
      const wire = incoming.get(portKey(targetId, inputId));
      if (!wire || !active.has(wire.from)) continue;
      outgoing.get(wire.from).push(targetId);
      indegree.set(targetId, indegree.get(targetId) + 1);
    }
  }
  const ready = [...active].filter((id) => indegree.get(id) === 0);
  const order = [];
  while (ready.length) {
    const id = ready.shift(); order.push(id);
    for (const next of outgoing.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) ready.push(next);
    }
  }
  if (order.length !== active.size) return { error: "Hay un ciclo de señales combinacionales. Revisa las conexiones del circuito." };

  const values = new Map();
  const nodeSignals = {};
  const context = { program, runtime };
  for (const id of order) {
    const node = byId.get(id);
    const inputs = {};
    for (const port of PORTS[node.type]?.inputs || []) {
      const wire = incoming.get(portKey(id, port.id));
      inputs[port.id] = wire ? values.get(portKey(wire.from, wire.fromPort)) ?? null : null;
    }
    const outputs = evaluateNode(node, (port) => inputs[port], context);
    for (const [port, value] of Object.entries(outputs)) values.set(portKey(id, port), value);
    nodeSignals[id] = { inputs, outputs };
  }

  // Fill late sequential inputs after every combinational source has settled.
  // These ports feed state updates; they must not become combinational graph
  // dependencies (especially PC.next, which would create a false PC cycle).
  for (const id of order) {
    const node = byId.get(id);
    for (const port of PORTS[node.type].inputs) {
      const wire = incoming.get(portKey(id, port.id));
      if (!wire) continue;
      nodeSignals[id].inputs[port.id] = values.get(portKey(wire.from, wire.fromPort)) ?? null;
    }
  }

  const fetchedAddress = nodeSignals[roles.instructionMemory]?.inputs?.address;
  const fetchedInstructionWord = nodeSignals[roles.instructionMemory]?.outputs?.instruction;
  if (fetchedAddress == null) return { error: "La memoria de instrucciones no recibe una señal de dirección." };
  if (fetchedInstructionWord == null) return { done: true, reason: `La memoria de instrucciones no contiene código en ${formatAddress(fetchedAddress)}.` };
  const currentInstruction = program.byAddress.get(u32(fetchedAddress));
  if (!currentInstruction) return { error: `La palabra de ${formatAddress(fetchedAddress)} no corresponde a una instrucción del programa cargado.` };

  // A connected port is not enough: it must carry a real value this cycle.
  // Check after detecting end-of-program so an empty fetch still stops normally.
  for (const id of order) {
    const node = byId.get(id);
    const signals = nodeSignals[id];
    for (const port of PORTS[node.type].inputs) {
      if (isSequentialBoundaryInput(node, port.id)) continue;
      const value = signals.inputs[port.id];
      if (value == null) return { error: `No llega una señal válida a ${node.name}.${port.label}. Revisa la conexión y su origen.` };
    }
    for (const port of PORTS[node.type].outputs) {
      const value = signals.outputs[port.id];
      if (value == null) return { error: `${node.name}.${port.label} no puede producir una señal válida en este ciclo.` };
      const width = resolveWidth(node, port.id);
      const maxValue = width === 32 ? 0xffffffff : (2 ** width) - 1;
      if (!Number.isInteger(value) || value < 0 || value > maxValue) {
        return { error: `${node.name}.${port.label} produjo un valor fuera de su ancho de ${width} bits.` };
      }
    }
  }

  const sinkValue = (nodeIdValue, port) => {
    const wire = incoming.get(portKey(nodeIdValue, port));
    return wire ? values.get(portKey(wire.from, wire.fromPort)) ?? null : null;
  };
  const nextPc = sinkValue(roles.pc, "next");
  if (nextPc == null) return { error: `No llega una señal al PC.siguiente PC desde ${formatAddress(runtime.pc)}. Revisa la ruta de selección del siguiente PC.` };
  const regWrite = sinkValue(roles.registerFile, "regWrite");
  if (regWrite == null) return { error: "La entrada Banco de registros.RegWrite no recibe señal." };
  const memWrite = sinkValue(roles.dataMemory, "memWrite");
  if (memWrite == null) return { error: "La entrada Memoria de datos.MemWrite no recibe señal." };

  let registerWrite = null;
  const registers = [...runtime.registers];
  if (regWrite === 1) {
    const destination = sinkValue(roles.registerFile, "writeRegister");
    const value = sinkValue(roles.registerFile, "writeData");
    if (destination == null || value == null) return { error: "El banco de registros debe recibir el registro y el dato de escritura cuando RegWrite está activo." };
    if ((destination & 31) !== 0) {
      registers[destination & 31] = u32(value);
      registerWrite = { register: destination & 31, value: u32(value) };
    }
  }

  let memoryWrite = null;
  const memory = { ...runtime.memory };
  const memoryRead = sinkValue(roles.dataMemory, "memRead");
  const memoryAddress = sinkValue(roles.dataMemory, "address");
  if ((memWrite === 1 || memoryRead === 1) && memoryAddress != null && (memoryAddress & 3) !== 0) {
    return { error: `Dirección desalineada ${formatAddress(memoryAddress)}: lw y sw necesitan múltiplos de 4.` };
  }
  if (memWrite === 1) {
    const address = sinkValue(roles.dataMemory, "address");
    const value = sinkValue(roles.dataMemory, "writeData");
    if (address == null || value == null) return { error: "La memoria necesita dirección y dato cuando MemWrite está activo." };
    memory[u32(address)] = u32(value);
    memoryWrite = { address: u32(address), value: u32(value) };
  }

  registers[0] = 0;
  const nextRuntime = { pc: u32(nextPc), registers, memory, cycles: runtime.cycles + 1 };
  const wireValues = {};
  const activeWires = new Set();
  for (const wire of graph.wires) {
    const value = values.get(portKey(wire.from, wire.fromPort));
    if (value !== undefined && value !== null) {
      wireValues[wire.id] = value;
      activeWires.add(wire.id);
    }
  }
  return {
    runtime: nextRuntime,
    nodeSignals,
    wireValues,
    activeWires,
    instruction: currentInstruction,
    pcBefore: runtime.pc,
    pcAfter: nextRuntime.pc,
    registerWrite,
    memoryWrite,
  };
}

export function signalText(value, width = 32) {
  if (value === null || value === undefined) return "sin señal";
  const numeric = u32(value);
  if (width === 1) return numeric ? "1 · activa" : "0 · inactiva";
  const hexDigits = Math.max(1, Math.ceil(width / 4));
  return `${numeric | 0} · 0x${numeric.toString(16).padStart(hexDigits, "0")}`;
}

export function registerName(index) {
  const names = ["$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3", "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7", "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7", "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra"];
  return names[index & 31];
}

export function newWire(from, fromPort, to, toPort) {
  return { id: wireId(), from, fromPort, to, toPort };
}

export function freshNode(type, count) {
  const x = 80 + (count % 4) * 300;
  const y = 80 + Math.floor(count / 4) * 260;
  const config = type === "mux2" ? { width: 32 } : type === "constant" ? { width: 32, value: 0 } : {};
  return createNode(type, x, y, { config });
}

export function wireSignal(graph, result, wire) {
  const source = graph.nodes.find((node) => node.id === wire.from);
  return { value: result?.wireValues?.[wire.id], width: source ? widthOf(source, wire.fromPort) : 32 };
}
