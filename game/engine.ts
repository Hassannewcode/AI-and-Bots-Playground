import { ExecutionResult, FileSystemTree } from './types';
import { nanoid } from 'nanoid';
import { parseUniversalCode } from './universal_engine';


export function parseCode(code: string, fileSystem: FileSystemTree): Omit<ExecutionResult, 'newState'> {
    // The engine is now universal and doesn't branch based on language.
    return parseUniversalCode(code, fileSystem);
}