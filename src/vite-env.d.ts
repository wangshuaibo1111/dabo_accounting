/// <reference types="vite/client" />

declare module 'sql.js' {
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: (string | number)[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export interface Statement {
    bind(params?: (string | number)[]): boolean
    step(): boolean
    getAsObject(params?: Record<string, never>): Record<string, unknown>
    free(): boolean
  }

  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }
}
