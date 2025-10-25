

import React from 'react';

// Reusable components for styling the guide
const H1: React.FC<{children: React.ReactNode}> = ({ children }) => <h1 className="text-xl font-bold text-white mb-4 font-sans">{children}</h1>;
const H2: React.FC<{children: React.ReactNode}> = ({ children }) => <h2 className="text-lg font-bold text-teal-400 mt-6 mb-3 font-sans">{children}</h2>;
const H3: React.FC<{children: React.ReactNode}> = ({ children }) => <h3 className="text-md font-semibold text-white mt-4 mb-2 font-sans">{children}</h3>;
const P: React.FC<{children: React.ReactNode}> = ({ children }) => <p className="text-gray-400 mb-4 text-sm leading-relaxed font-sans">{children}</p>;
const Code: React.FC<{children: React.ReactNode}> = ({ children }) => <code className="bg-gray-900 text-cyan-300 px-1.5 py-0.5 rounded-md text-xs font-mono">{children}</code>;
const LI: React.FC<{children: React.ReactNode}> = ({ children }) => <li className="mb-3 ml-4 pl-2 border-l-2 border-gray-700">{children}</li>;

export const TechnologyGuide: React.FC = () => (
    <div className="text-gray-300 p-2 font-sans text-sm">
        <H1>How Languages Run in the Browser</H1>
        <P>
            The execution of diverse programming languages within a web browser is fundamentally enabled by a technology called <Code>WebAssembly (Wasm)</Code>. It acts as a universal, high-performance compilation target that allows code from languages like C++, Rust, and Python to run securely and efficiently right here on this page.
        </P>

        <H2>Foundational Architecture: WebAssembly</H2>
        <P>
            WebAssembly is a low-level, binary instruction format that runs in a sandboxed environment. It's not a replacement for JavaScript, but a companion. JavaScript manages the Wasm module's lifecycle (loading, compiling, running) and bridges communication between the Wasm code and web APIs. This design provides near-native performance for computationally heavy tasks while maintaining the security of the web platform.
        </P>

        <H2>Strategy I: Direct Compilation (C, C++, Rust)</H2>
        <P>
            System-level languages are compiled directly into Wasm modules ahead-of-time. This approach prioritizes speed and small binary sizes.
        </P>
        <ul>
            <LI>
                <H3>C &amp; C++</H3>
                <P>The <Code>Emscripten</Code> toolchain compiles C/C++ code into a <Code>.wasm</Code> module and a JavaScript "glue" file. This glue code is essential for loading the module and translating system calls (like file I/O) into browser-compatible operations, often using a virtual in-memory file system.</P>
            </LI>
            <LI>
                <H3>Rust</H3>
                <P>Rust has first-class support for WebAssembly as a compilation target. The <Code>wasm-bindgen</Code> tool is used to generate the necessary bindings for seamless, high-level data exchange between Rust and JavaScript, making it highly efficient for web-based applications.</P>
            </LI>
        </ul>

        <H2>Strategy II: Interpreter Virtualization (Python, Ruby)</H2>
        <P>
            For dynamic, interpreted languages, the entire language interpreter itself is compiled into a single, self-contained Wasm module. This allows the full language and its ecosystem to run in the browser.
        </P>
        <ul>
            <LI>
                <H3>Python</H3>
                <P>This IDE uses <Code>Pyodide</Code>, a project that compiles the CPython interpreter to Wasm. This provides high fidelity to the Python language and even allows for installing pure Python packages from PyPI using <Code>micropip</Code>. A robust Foreign Function Interface (FFI) allows Python to interact with Web APIs and JavaScript, and vice-versa.</P>
            </LI>
            <LI>
                <H3>Ruby</H3>
                <P>Similar to Python, the <Code>ruby.wasm</Code> project compiles the official CRuby interpreter into a Wasm module, enabling Ruby scripts to be executed client-side.</P>
            </LI>
        </ul>

         <H2>Strategy III: Managed Runtimes (Java, Go, C#)</H2>
        <P>
            Languages with advanced runtimes, such as garbage collection or concurrency models, require specialized compilers or runtime management solutions to target Wasm.
        </P>
        <ul>
            <LI>
                <H3>Java &amp; Kotlin</H3>
                <P>Tools like <Code>TeaVM</Code> (for Java) or the native <Code>Kotlin/Wasm</Code> compiler translate JVM bytecode into Wasm. This process includes compiling the necessary parts of the runtime, such as the garbage collector, into the Wasm module.</P>
            </LI>
            <LI>
                <H3>Go</H3>
                <P>The official Go toolchain supports compiling to Wasm. This produces a <Code>.wasm</Code> file and a required JavaScript shim (<Code>wasm_exec.js</Code>) that manages the Go runtime's specific needs, like goroutine scheduling, inside the browser.</P>
            </LI>
             <LI>
                <H3>C#</H3>
                <P>Through the Blazor framework, the .NET runtime (CoreCLR) is compiled to WebAssembly, allowing C# and F# code to execute directly in the browser.</P>
            </LI>
        </ul>
    </div>
);