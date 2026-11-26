import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  NODE_INFO, NODE_WIDTH, PALETTE, PORTS, assembleProgram, createDefaultGraph, freshNode,
  initialRuntime, newWire, parseInitialState, parseNumber, signalText, registerName, stepCircuit, widthOf,
} from "./simulator.js";
import "./styles.css";

const DEFAULT_PC = "0x00400000";
const DEFAULT_ASSEMBLY = `addi $t0, $zero, 7
addi $t1, $zero, 5
add  $t2, $t0, $t1
sub  $t3, $t0, $t1
and  $t4, $t0, $t1
or   $t5, $t0, $t1
slt  $t6, $t3, $t0
sw   $t2, 0($zero)
lw   $s0, 0($zero)
beq  $s0, $t2, continuar
addi $t2, $zero, 0
continuar:
j    final
addi $t3, $zero, 99
final:
addi $v0, $zero, 1`;

const INITIAL_STATE = parseInitialState(DEFAULT_PC, "", "");
const INITIAL_PROGRAM = assembleProgram(DEFAULT_ASSEMBLY, INITIAL_STATE.pc);

function hex(value, digits = 8) {
  return `0x${(Number(value) >>> 0).toString(16).padStart(digits, "0")}`;
}

function nodeHeight(node) {
  const count = Math.max(PORTS[node.type]?.inputs.length || 0, PORTS[node.type]?.outputs.length || 0, 1);
  return 58 + count * 26;
}

function getPortPosition(node, direction, portId) {
  const ports = direction === "input" ? PORTS[node.type].inputs : PORTS[node.type].outputs;
  const index = ports.findIndex((port) => port.id === portId);
  return { x: node.x + (direction === "output" ? NODE_WIDTH : 0), y: node.y + 61 + index * 26 };
}

function wirePath(graph, wire) {
  const source = graph.nodes.find((node) => node.id === wire.from);
  const target = graph.nodes.find((node) => node.id === wire.to);
  if (!source || !target) return "";
  const a = getPortPosition(source, "output", wire.fromPort);
  const b = getPortPosition(target, "input", wire.toPort);
  if (b.x < a.x) return `M ${a.x} ${a.y} C ${a.x + 70} ${a.y}, ${a.x + 80} 22, ${(a.x + b.x) / 2} 22 S ${b.x - 55} ${b.y}, ${b.x} ${b.y}`;
  const curve = Math.max(55, (b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + curve} ${a.y}, ${b.x - curve} ${b.y}, ${b.x} ${b.y}`;
}

function displaySignal(value, width) {
  return signalText(value, width);
}

function SignalValue({ value, width = 32 }) {
  return <span className={`signal-value ${value === null || value === undefined ? "is-empty" : ""}`}>{displaySignal(value, width)}</span>;
}

function PortRow({ node, port, direction, value, pending, onPort }) {
  const output = direction === "output";
  return (
    <div className={`port-row ${output ? "is-output" : "is-input"}`} title={`${port.label} · ${port.width === "config" ? widthOf(node, port.id) : port.width} bits`}>
      {!output && <button className={`port-dot ${pending ? "pending" : ""}`} aria-label={`Entrada ${port.label}`} onClick={(event) => { event.stopPropagation(); onPort(node, port, direction); }} />}
      <span className="port-label">{port.label}</span>
      {output && <button className={`port-dot ${pending ? "pending" : ""}`} aria-label={`Salida ${port.label}`} onClick={(event) => { event.stopPropagation(); onPort(node, port, direction); }} />}
      <span className="port-bits">{port.width === "config" ? widthOf(node, port.id) : port.width}b</span>
      <span className={`port-value ${value === null || value === undefined ? "quiet" : ""}`}>{value === null || value === undefined ? "—" : `0x${(Number(value) >>> 0).toString(16).slice(-6)}`}</span>
    </div>
  );
}

function DatapathNode({ node, graph, selected, signals, draft, onSelect, onPort, onDragStart, onDelete }) {
  const info = NODE_INFO[node.type];
  const isDraftSource = draft?.nodeId === node.id && draft?.portId;
  const hasSignal = [...Object.values(signals?.inputs || {}), ...Object.values(signals?.outputs || {})].some((value) => value !== null && value !== undefined);
  return (
    <article
      className={`node-card tone-${info.color} ${selected ? "is-selected" : ""} ${isDraftSource ? "is-wire-source" : ""} ${hasSignal ? "has-live-signal" : ""}`}
      style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: nodeHeight(node) }}
      onClick={(event) => { event.stopPropagation(); onSelect({ type: "node", id: node.id }); }}
      aria-label={info.title}
    >
      <header className="node-heading" onPointerDown={(event) => onDragStart(event, node)}>
        <span className="node-icon">{info.icon}</span>
        <span className="node-name" title={node.name}>{node.name}</span>
        <button className="node-delete" title="Retirar componente" aria-label={`Retirar ${node.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(node); }}>×</button>
      </header>
      <div className="node-ports">
        <div className="port-column">
          {(PORTS[node.type]?.inputs || []).map((port) => <PortRow key={port.id} node={node} port={port} direction="input" value={signals?.inputs?.[port.id]} onPort={onPort} />)}
        </div>
        <div className="port-column output-column">
          {(PORTS[node.type]?.outputs || []).map((port) => <PortRow key={port.id} node={node} port={port} direction="output" value={signals?.outputs?.[port.id]} pending={draft?.nodeId === node.id && draft?.portId === port.id} onPort={onPort} />)}
        </div>
      </div>
    </article>
  );
}

function App() {
  const [graph, setGraph] = useState(createDefaultGraph);
  const [assembly, setAssembly] = useState(DEFAULT_ASSEMBLY);
  const [pcText, setPcText] = useState(DEFAULT_PC);
  const [registerText, setRegisterText] = useState("");
  const [memoryText, setMemoryText] = useState("");
  const [program, setProgram] = useState(INITIAL_PROGRAM);
  const [runtime, setRuntime] = useState(() => initialRuntime(INITIAL_STATE));
  const [lastResult, setLastResult] = useState(null);
  const [inputsCurrent, setInputsCurrent] = useState(true);
  const [message, setMessage] = useState("Circuito cargado. Avanza un ciclo para seguir las señales.");
  const [selected, setSelected] = useState(null);
  const [wireDraft, setWireDraft] = useState(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [drag, setDrag] = useState(null);
  const canvasRef = useRef(null);
  const graphRef = useRef(graph);
  const programRef = useRef(program);
  const runtimeRef = useRef(runtime);
  const inputsCurrentRef = useRef(true);
  const runStepRef = useRef(null);

  graphRef.current = graph;
  programRef.current = program;
  runtimeRef.current = runtime;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => runStepRef.current?.(), 480);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const releaseDrag = () => setDrag(null);
    window.addEventListener("pointerup", releaseDrag);
    window.addEventListener("pointercancel", releaseDrag);
    return () => {
      window.removeEventListener("pointerup", releaseDrag);
      window.removeEventListener("pointercancel", releaseDrag);
    };
  }, []);

  const selectedNode = selected?.type === "node" ? graph.nodes.find((node) => node.id === selected.id) : null;
  const selectedWire = selected?.type === "wire" ? graph.wires.find((wire) => wire.id === selected.id) : null;
  const wireSourceNode = selectedWire ? graph.nodes.find((node) => node.id === selectedWire.from) : null;
  const wireTargetNode = selectedWire ? graph.nodes.find((node) => node.id === selectedWire.to) : null;
  const selectedSignals = selectedNode ? lastResult?.nodeSignals?.[selectedNode.id] : null;
  const registerWrites = useMemo(() => runtime.registers.map((value, index) => ({ index, name: registerName(index), value })), [runtime.registers]);
  const memoryRows = useMemo(() => Object.entries(runtime.memory).map(([address, value]) => ({ address: Number(address), value })).sort((a, b) => a.address - b.address), [runtime.memory]);

  function selectItem(nextSelection) { setSelected(nextSelection); }

  function changeInput(setter, value) {
    setter(value);
    inputsCurrentRef.current = false;
    setInputsCurrent(false);
    setRunning(false);
    setLastResult(null);
    setMessage("Hay cambios de entrada sin aplicar. Aplícalos para continuar.");
  }

  function updateGraphNode(id, changes) {
    setGraph((previous) => ({ ...previous, nodes: previous.nodes.map((node) => node.id === id ? { ...node, ...changes } : node) }));
  }

  function addComponent(type) {
    setRunning(false);
    const roleByType = { pc: "pc", instructionMemory: "instructionMemory", registerFile: "registerFile", dataMemory: "dataMemory" };
    if (roleByType[type] && graph.nodes.some((node) => node.type === type)) {
      setMessage(`El circuito ya tiene ${NODE_INFO[type].title}. Retira ese bloque antes de colocar otro.`);
      return;
    }
    const node = freshNode(type, Math.max(0, graph.nodes.length - 20));
    setGraph((previous) => ({
      ...previous,
      nodes: [...previous.nodes, node],
      roles: roleByType[type] ? { ...previous.roles, [roleByType[type]]: node.id } : previous.roles,
    }));
    setSelected({ type: "node", id: node.id });
    setLastResult(null);
    setMessage(`${NODE_INFO[type].title} añadido. Conecta sus puertos para incorporarlo a la ruta.`);
  }

  function deleteNode(node) {
    setRunning(false);
    setGraph((previous) => ({ ...previous, nodes: previous.nodes.filter((item) => item.id !== node.id), wires: previous.wires.filter((wire) => wire.from !== node.id && wire.to !== node.id) }));
    setSelected(null);
    setWireDraft(null);
    setLastResult(null);
    setMessage(`${node.name} y sus conexiones se han retirado del diseño.`);
  }

  function deleteSelectedWire() {
    if (!selectedWire) return;
    setRunning(false);
    setGraph((previous) => ({ ...previous, wires: previous.wires.filter((wire) => wire.id !== selectedWire.id) }));
    setSelected(null);
    setLastResult(null);
    setMessage("Conexión retirada.");
  }

  function resetCircuit() {
    setRunning(false);
    setGraph(createDefaultGraph());
    setSelected(null);
    setWireDraft(null);
    setLastResult(null);
    setMessage("Datapath MIPS32 inicial restaurado.");
  }

  function onPort(node, port, direction) {
    if (direction === "output") {
      setWireDraft({ nodeId: node.id, portId: port.id });
      setSelected({ type: "node", id: node.id });
      setMessage(`Salida «${port.label}» seleccionada. Elige una entrada compatible.`);
      return;
    }
    if (!wireDraft) {
      setMessage("Primero selecciona un puerto de salida.");
      return;
    }
    const sourceNode = graph.nodes.find((item) => item.id === wireDraft.nodeId);
    if (!sourceNode) { setWireDraft(null); return; }
    if (sourceNode.id === node.id && wireDraft.portId === port.id) return;
    const outWidth = widthOf(sourceNode, wireDraft.portId);
    const inWidth = widthOf(node, port.id);
    if (outWidth !== inWidth) {
      setMessage(`Anchos incompatibles: ${outWidth} bits en la salida y ${inWidth} bits en la entrada.`);
      return;
    }
    const occupied = graph.wires.find((wire) => wire.to === node.id && wire.toPort === port.id);
    if (occupied) {
      setMessage(`La entrada «${port.label}» ya tiene una conexión. Retírala antes de sustituirla.`);
      return;
    }
    const wire = newWire(sourceNode.id, wireDraft.portId, node.id, port.id);
    setRunning(false);
    setGraph((previous) => ({ ...previous, wires: [...previous.wires, wire] }));
    setWireDraft(null);
    setSelected({ type: "wire", id: wire.id });
    setLastResult(null);
    setMessage(`Conectada ${sourceNode.name}.${wireDraft.portId} → ${node.name}.${port.id}.`);
  }

  function beginDrag(event, node) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected({ type: "node", id: node.id });
    setDrag({ id: node.id, x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y });
  }

  function moveDrag(event) {
    if (!drag) return;
    updateGraphNode(drag.id, { x: Math.max(0, drag.nodeX + event.clientX - drag.x), y: Math.max(0, drag.nodeY + event.clientY - drag.y) });
  }

  function applyInputs() {
    setRunning(false);
    inputsCurrentRef.current = false;
    setInputsCurrent(false);
    setLastResult(null);
    try {
      const initial = parseInitialState(pcText, registerText, memoryText);
      const assembled = assembleProgram(assembly, initial.pc);
      setProgram(assembled);
      programRef.current = assembled;
      const next = initialRuntime(initial);
      setRuntime(next);
      runtimeRef.current = next;
      inputsCurrentRef.current = true;
      setInputsCurrent(true);
      setHistory([]);
      setMessage(`Programa cargado: ${assembled.instructions.length} instrucciones desde ${hex(initial.pc)}.`);
    } catch (error) {
      setMessage(error.message || "No se pudieron aplicar las entradas.");
    }
  }

  function advanceOneCycle() {
    if (!inputsCurrentRef.current) {
      setMessage("Aplica las entradas actuales antes de continuar la simulación.");
      return;
    }
    setRunning(false);
    const result = stepCircuit(graphRef.current, programRef.current, runtimeRef.current);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (result.done) {
      setMessage(result.reason);
      return;
    }
    setRuntime(result.runtime);
    runtimeRef.current = result.runtime;
    setLastResult(result);
    const changes = [];
    if (result.registerWrite) changes.push(`${registerName(result.registerWrite.register)} ← ${hex(result.registerWrite.value)}`);
    if (result.memoryWrite) changes.push(`Mem[${hex(result.memoryWrite.address)}] ← ${hex(result.memoryWrite.value)}`);
    setMessage(`Ciclo ${result.runtime.cycles}: ${result.instruction.text}${changes.length ? ` · ${changes.join(" · ")}` : " · sin escritura"}`);
    setHistory((previous) => [{ cycle: result.runtime.cycles, pc: result.pcBefore, instruction: result.instruction.text, registerWrite: result.registerWrite, memoryWrite: result.memoryWrite }, ...previous].slice(0, 12));
  }

  runStepRef.current = () => {
    if (!inputsCurrentRef.current) {
      setRunning(false);
      setMessage("Aplica las entradas actuales antes de continuar la simulación.");
      return;
    }
    const result = stepCircuit(graphRef.current, programRef.current, runtimeRef.current);
    if (result.error) {
      setRunning(false);
      setMessage(result.error);
      return;
    }
    if (result.done) {
      setRunning(false);
      setMessage(result.reason);
      return;
    }
    setRuntime(result.runtime);
    runtimeRef.current = result.runtime;
    setLastResult(result);
    const changes = [];
    if (result.registerWrite) changes.push(`${registerName(result.registerWrite.register)} ← ${hex(result.registerWrite.value)}`);
    if (result.memoryWrite) changes.push(`Mem[${hex(result.memoryWrite.address)}] ← ${hex(result.memoryWrite.value)}`);
    setMessage(`Ciclo ${result.runtime.cycles}: ${result.instruction.text}${changes.length ? ` · ${changes.join(" · ")}` : " · sin escritura"}`);
    setHistory((previous) => [{ cycle: result.runtime.cycles, pc: result.pcBefore, instruction: result.instruction.text, registerWrite: result.registerWrite, memoryWrite: result.memoryWrite }, ...previous].slice(0, 12));
  };

  function resetExecution() {
    setRunning(false);
    inputsCurrentRef.current = false;
    setInputsCurrent(false);
    setLastResult(null);
    try {
      const initial = parseInitialState(pcText, registerText, memoryText);
      const assembled = assembleProgram(assembly, initial.pc);
      setProgram(assembled);
      programRef.current = assembled;
      const next = initialRuntime(initial);
      setRuntime(next);
      runtimeRef.current = next;
      inputsCurrentRef.current = true;
      setInputsCurrent(true);
      setHistory([]);
      setMessage("Ejecución reiniciada con las entradas actuales.");
    } catch (error) {
      setMessage(error.message || "No se pudo reiniciar la ejecución.");
    }
  }

  function canvasClick(event) {
    if (event.target === canvasRef.current || event.target.classList.contains("wire-layer")) {
      if (!wireDraft) setSelected(null);
    }
  }

  const selectedWireValue = selectedWire && lastResult ? lastResult.wireValues?.[selectedWire.id] : undefined;
  const selectedWireWidth = selectedWire && wireSourceNode ? widthOf(wireSourceNode, selectedWire.fromPort) : 32;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark"><span className="brand-chip">M32</span><div><strong>Datapath Lab</strong><span>Simulador didáctico · monociclo</span></div></div>
        <div className="header-status"><span className="status-dot" /> MIPS32 · 32 bits <span className="header-divider" /> {program.instructions.length} instrucciones cargadas</div>
      </header>

      <section className="simulation-bar">
        <div className="sim-controls">
          <button className="control-button primary" onClick={advanceOneCycle} disabled={running || !inputsCurrent}><span>▷|</span> Un ciclo</button>
          {running
            ? <button className="control-button pause" onClick={() => { setRunning(false); setMessage("Simulación pausada."); }}><span>Ⅱ</span> Pausar</button>
            : <button className="control-button" onClick={() => { setRunning(true); setMessage("Simulación en marcha."); }} disabled={!inputsCurrent}><span>▶</span> Ejecutar</button>}
          <button className="control-button quiet-button" onClick={resetExecution}><span>↺</span> Reiniciar</button>
        </div>
        <div className="run-state"><div className={`run-pulse ${running ? "is-running" : ""}`} /><div><span className="eyebrow">CICLO {runtime.cycles}</span><strong>PC {hex(runtime.pc)}</strong></div></div>
        <div className="message-strip" title={message}><span className="message-icon">i</span><span>{message}</span></div>
        <button className="restore-button" onClick={resetCircuit} title="Restaurar el datapath estándar">Restaurar circuito</button>
      </section>

      <main className="workspace">
        <aside className="left-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">DISEÑO</span><h2>Componentes</h2></div><span className="count-pill">{graph.nodes.length}</span></div>
          <p className="panel-help">Elige un bloque y se añadirá al área de trabajo. Arrastra desde su cabecera para moverlo.</p>
          <div className="palette-list">
            {PALETTE.map(([type, label]) => <button className="palette-button" key={type} onClick={() => addComponent(type)}><span className={`palette-icon tone-${NODE_INFO[type].color}`}>{NODE_INFO[type].icon}</span><span>{label}</span><b>+</b></button>)}
          </div>
          <div className="wire-help"><span className="wire-help-icon">↗</span><div><strong>Crear una conexión</strong><p>Selecciona un punto de salida y después una entrada del mismo ancho.</p></div></div>
          {wireDraft && <button className="cancel-wire" onClick={() => { setWireDraft(null); setMessage("Conexión cancelada."); }}>Cancelar conexión</button>}
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div><span className="eyebrow">RUTA DE DATOS</span><strong>Procesador MIPS32 · monociclo</strong></div>
            <div className="canvas-legend"><span><i className="legend-active" /> Señal activa</span><span><i className="legend-control" /> Control</span><span>Selecciona bloques para ver sus señales</span></div>
          </div>
          <div className={`canvas-scroll ${wireDraft ? "is-connecting" : ""}`} onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onClick={canvasClick}>
            <div className="diagram" ref={canvasRef} onClick={canvasClick}>
              <svg className="wire-layer" width="3000" height="1220" aria-label="Conexiones del circuito">
                <defs>
                  <marker id="arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" /></marker>
                  <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#42e3b4" /></marker>
                  <marker id="arrow-control" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f3ad62" /></marker>
                </defs>
                {graph.wires.map((wire) => {
                  const active = Boolean(lastResult?.activeWires?.has(wire.id));
                  const source = graph.nodes.find((node) => node.id === wire.from);
                  const target = graph.nodes.find((node) => node.id === wire.to);
                  const controlSignal = source && widthOf(source, wire.fromPort) <= 6;
                  return <g key={wire.id} className={active ? "wire-active" : "wire-muted"} onClick={(event) => { event.stopPropagation(); setSelected({ type: "wire", id: wire.id }); }}>
                    <path d={wirePath(graph, wire)} className="wire-hit" />
                    <path d={wirePath(graph, wire)} className={`wire-line ${active ? "active" : ""} ${active && controlSignal ? "control-signal" : ""} ${selected?.id === wire.id ? "selected" : ""}`} markerEnd={`url(#${active ? controlSignal ? "arrow-control" : "arrow-active" : "arrow-muted"})`} />
                    {active && source && target && <text className="wire-value" x={(getPortPosition(source, "output", wire.fromPort).x + getPortPosition(target, "input", wire.toPort).x) / 2} y={(getPortPosition(source, "output", wire.fromPort).y + getPortPosition(target, "input", wire.toPort).y) / 2 - 7}>{signalText(lastResult.wireValues[wire.id], widthOf(source, wire.fromPort)).split(" · ")[0]}</text>}
                  </g>;
                })}
              </svg>
              <div className="canvas-watermark">MIPS32 <span>32-bit single cycle</span></div>
              {graph.nodes.map((node) => <DatapathNode
                key={node.id}
                node={node}
                graph={graph}
                selected={selected?.type === "node" && selected.id === node.id}
                signals={lastResult?.nodeSignals?.[node.id]}
                draft={wireDraft}
                onSelect={selectItem}
                onPort={onPort}
                onDragStart={beginDrag}
                onDelete={deleteNode}
              />)}
            </div>
          </div>
          <div className="canvas-footer"><span><b>{graph.wires.length}</b> conexiones</span><span>Los cambios de cableado se usan en la simulación</span><button onClick={deleteSelectedWire} disabled={!selectedWire}>Retirar conexión seleccionada</button></div>
        </section>

        <aside className="right-panel panel">
          {selectedNode ? <section className="inspector-section selected-info">
            <div className="panel-heading"><div><span className="eyebrow">INFORMACIÓN</span><h2>{selectedNode.name}</h2></div><span className={`info-icon tone-${NODE_INFO[selectedNode.type].color}`}>{NODE_INFO[selectedNode.type].icon}</span></div>
            <p className="component-description">{NODE_INFO[selectedNode.type].description}</p>
            <div className="instruction-note"><span>↳</span>{NODE_INFO[selectedNode.type].instructions}</div>
            <div className="signal-section"><h3>Entradas <span>· valor actual</span></h3>
              {(PORTS[selectedNode.type]?.inputs || []).map((port) => <div className="signal-row" key={port.id}><span className="signal-port-name">{port.label} <small>{port.width === "config" ? widthOf(selectedNode, port.id) : port.width}b</small></span><SignalValue value={selectedSignals?.inputs?.[port.id]} width={port.width === "config" ? widthOf(selectedNode, port.id) : port.width} /></div>)}
              {PORTS[selectedNode.type]?.inputs.length === 0 && <p className="empty-note">Este bloque no tiene entradas.</p>}
            </div>
            <div className="signal-section"><h3>Salidas <span>· valor actual</span></h3>
              {(PORTS[selectedNode.type]?.outputs || []).map((port) => <div className="signal-row" key={port.id}><span className="signal-port-name">{port.label} <small>{port.width === "config" ? widthOf(selectedNode, port.id) : port.width}b</small></span><SignalValue value={selectedSignals?.outputs?.[port.id]} width={port.width === "config" ? widthOf(selectedNode, port.id) : port.width} /></div>)}
            </div>
            {selectedNode.type === "constant" && <label className="compact-field">Valor de la constante<input type="number" value={selectedNode.config.value} onChange={(event) => { setRunning(false); setLastResult(null); updateGraphNode(selectedNode.id, { config: { ...selectedNode.config, value: Number(event.target.value) } }); }} /></label>}
          </section> : selectedWire && wireSourceNode && wireTargetNode ? <section className="inspector-section selected-info">
            <div className="panel-heading"><div><span className="eyebrow">SEÑAL</span><h2>{selectedWire.fromPort}</h2></div><span className="info-icon tone-cyan">↔</span></div>
            <p className="component-description">Conecta <strong>{wireSourceNode.name}.{selectedWire.fromPort}</strong> con <strong>{wireTargetNode.name}.{selectedWire.toPort}</strong>.</p>
            <div className="signal-row signal-row-large"><span className="signal-port-name">Valor actual <small>{selectedWireWidth}b</small></span><SignalValue value={selectedWireValue} width={selectedWireWidth} /></div>
            <button className="danger-button" onClick={deleteSelectedWire}>Retirar esta conexión</button>
          </section> : <section className="inspector-section welcome-info">
            <div className="empty-orbit">◉</div><span className="eyebrow">EXPLORA LA RUTA</span><h2>Selecciona un componente</h2><p>Aquí verás qué función cumple y qué señal recibe y entrega durante cada ciclo.</p>
          </section>}

          <section className="inspector-section input-section">
            <div className="panel-heading"><div><span className="eyebrow">ENTRADAS</span><h2>Programa y estado</h2></div></div>
            <label className="field-label">Programa MIPS <span>etiquetas con «:», comentarios con #</span><textarea className="code-input" value={assembly} spellCheck="false" onChange={(event) => changeInput(setAssembly, event.target.value)} /></label>
            <label className="field-label">PC inicial <input value={pcText} onChange={(event) => changeInput(setPcText, event.target.value)} placeholder="0x00400000" /></label>
            <label className="field-label">Registros iniciales <span>uno por línea, por ejemplo $t0 = 7</span><textarea className="small-input" value={registerText} spellCheck="false" onChange={(event) => changeInput(setRegisterText, event.target.value)} placeholder="$t0 = 7&#10;$t1 = 5" /></label>
            <label className="field-label">Memoria de datos <span>dirección de byte = valor</span><textarea className="small-input" value={memoryText} spellCheck="false" onChange={(event) => changeInput(setMemoryText, event.target.value)} placeholder="0x10010000 = 12" /></label>
            <button className="apply-button" onClick={applyInputs}>Aplicar entradas y reiniciar <span>↻</span></button>
          </section>

          <section className="inspector-section runtime-section">
            <div className="panel-heading"><div><span className="eyebrow">ESTADO ACTUAL</span><h2>Registros</h2></div><span className="count-pill">32</span></div>
            <div className="register-grid">{registerWrites.map(({ index, name, value }) => <div className={`register-cell ${lastResult?.registerWrite?.register === index ? "changed" : ""}`} key={index}><span>{name}</span><b>{hex(value)}</b></div>)}</div>
            <div className="memory-heading"><h3>Memoria escrita</h3><span>{memoryRows.length} palabras</span></div>
            {memoryRows.length ? <div className="memory-table">{memoryRows.map((row) => <div className={`memory-row ${lastResult?.memoryWrite?.address === row.address ? "changed" : ""}`} key={row.address}><span>{hex(row.address)}</span><b>{hex(row.value)}</b></div>)}</div> : <p className="empty-note">No hay palabras iniciales ni escrituras todavía.</p>}
          </section>

          <section className="inspector-section history-section">
            <div className="panel-heading"><div><span className="eyebrow">RECORRIDO</span><h2>Últimos ciclos</h2></div></div>
            {history.length ? <div className="history-list">{history.map((row) => <div className="history-row" key={row.cycle}><span className="cycle-number">{String(row.cycle).padStart(2, "0")}</span><div><strong>{row.instruction}</strong><small>{hex(row.pc)}{row.registerWrite ? ` · ${registerName(row.registerWrite.register)} = ${hex(row.registerWrite.value)}` : ""}{row.memoryWrite ? ` · Mem[${hex(row.memoryWrite.address)}]` : ""}</small></div></div>)}</div> : <p className="empty-note">Ejecuta el primer ciclo para ver el recorrido.</p>}
          </section>
        </aside>
      </main>
      <footer className="app-footer"><span>Datapath Lab</span><span>Las señales se calculan desde las conexiones del circuito · Interfaz didáctica en español</span><span>32 bits</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
