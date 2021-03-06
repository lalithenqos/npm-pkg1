import { ValidObject } from './types';
import { FlclMsgController } from './flclMsgHandler';
export declare class FlclLogger {
    logger: ValidObject;
    requestId?: string;
    flclMsgController?: FlclMsgController;
    constructor(options: ValidObject);
    bindCustomLevelLogs(): void;
    private getCustomLevel;
    setRequestId(requestId: string): void;
    private getRequestId;
    private structurizeArg;
    private cleanObj;
    private _getStringified;
    static replacer(key: any, data: any): any;
    private displayInRootLevel;
    private canStringify;
    private _getStackTrace;
    trace(args: any): void;
    debug(args: any): void;
    info(args: any): void;
    warn(args: any): void;
    error(args: any): void;
    validation(args: any): void;
    critical(args: any): void;
    fatal(args: any): void;
}
