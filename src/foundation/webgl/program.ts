/** A linked program whose compilation may finish asynchronously. */
export interface WebGLProgramHandle {
  readonly program: WebGLProgram;
  /** True once linking finished successfully; never blocks when the parallel extension exists. */
  ready(): boolean;
  /** Link error text once compilation finished unsuccessfully. */
  error(): string | null;
  uniform(name: string): WebGLUniformLocation | null;
  dispose(): void;
}

const COMPLETION_STATUS_KHR = 0x91b1;

/**
 * Compile and link a program. With KHR_parallel_shader_compile the driver compiles in the
 * background and `ready()` polls completion instead of stalling the first transition frame.
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgramHandle {
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  let status: 'pending' | 'ready' | 'failed' = 'pending';
  let message: string | null = null;
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const settle = () => {
    if (status !== 'pending') return;
    if (parallel && !gl.getProgramParameter(program, COMPLETION_STATUS_KHR)) return;
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) status = 'ready';
    else {
      status = 'failed';
      message =
        gl.getProgramInfoLog(program) ||
        gl.getShaderInfoLog(fragment) ||
        gl.getShaderInfoLog(vertex) ||
        'WebGL program failed to link.';
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
  };
  return {
    program,
    ready() {
      settle();
      return status === 'ready';
    },
    error() {
      settle();
      return message;
    },
    uniform(name) {
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
      return uniforms.get(name) ?? null;
    },
    dispose() {
      gl.deleteProgram(program);
      uniforms.clear();
    },
  };
}
