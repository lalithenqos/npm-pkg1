"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Bunyan = __importStar(require("bunyan"));
let RotatingFileStream = require('bunyan-rotating-file-stream');
let appRoot = require('app-root-path') + '/';
let LogSerializer = require('./logSerializer');
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;
class BunyanClient {
    constructor(logFilePath, options) {
        options = options || {};
        this.name = options.name || 'Flcl-Logger-npm';
        this.type = options.type || 'raw';
        this.period = options.period || '1d';
        this.count = options.count || 50;
        this.threshold = options.threshold || '10m';
        this.totalSize = options.totalSize || '500m';
        this.logFilePath = logFilePath || appRoot;
        this.streamInfo = {
            target: 'console'
        };
        if (options.streamInfo) {
            if (options.streamInfo.target == 's3') {
                if (options.streamInfo.bucket && options.streamInfo.access_key_id && options.streamInfo.secret_access_key)
                    this.streamInfo = options.streamInfo;
            }
            else if (options.streamInfo.target == 'local')
                this.streamInfo.target = options.streamInfo.target;
        }
        console.log(this.streamInfo);
    }
    createLogger() {
        if (this.logger) {
            console.log('BunyanClient: CreateLogger -> Returning existing logger object...');
            return this.logger;
        }
        else {
            console.log('BunyanClient: CreateLogger -> Creating new logger object...');
            this.logger = Bunyan.createLogger({
                name: this.name,
                serializers: {
                    req: new LogSerializer().req,
                    res: new LogSerializer().res,
                    err: new LogSerializer().err,
                },
                streams: [
                    {
                        level: 30,
                        stream: this.getStreamObj('info')
                    },
                    {
                        level: 50,
                        stream: this.getStreamObj('error')
                    },
                    {
                        level: 20,
                        stream: this.getStreamObj('debug')
                    },
                    {
                        level: 10,
                        stream: this.getStreamObj('trace')
                    },
                    {
                        level: 40,
                        stream: this.getStreamObj('warn')
                    },
                    {
                        level: 60,
                        stream: this.getStreamObj('fatal')
                    }
                ],
            });
            return this.logger;
        }
    }
    getStreamObj(identifier) {
        let stream;
        if (this.streamInfo.target == 's3') {
            let streamParams = {
                bucket: this.streamInfo.bucket,
                access_key_id: this.streamInfo.access_key_id,
                secret_access_key: this.streamInfo.secret_access_key,
                name_format: (this.streamInfo.name_format_prefix || `%Y-%m-%d-%H-%M-%S-%L`) + `-${identifier}.log`,
                rotate_every: this.streamInfo.rotate_every || "day",
                upload_every: this.streamInfo.upload_every || 20 * 1000 //20 seconds
            };
            console.log(JSON.stringify(streamParams, null, 4));
            stream = new S3StreamLogger(streamParams);
            stream.on('error', function (err) {
                console.log('BUNYANCLIENT - S3 logger - Failure', err);
            });
        }
        else if (this.streamInfo.target == 'local') {
            let streamParams = {
                path: this.logFilePath + `${identifier}.log`,
                period: this.period,
                totalFiles: this.count,
                rotateExisting: true,
                threshold: this.threshold,
                totalSize: this.totalSize,
                gzip: false,
                shared: true,
            };
            console.log(JSON.stringify(streamParams, null, 4));
            stream = new RotatingFileStream(streamParams);
        }
        else {
            if (identifier == 'trace' || identifier == 'info' || identifier == 'debug')
                stream = process.stdout;
            else
                stream = process.stderr;
            console.log('Stream set to CONSOLE out/err for IDENTIFIER: ', identifier);
        }
        return stream;
    }
}
exports.BunyanClient = BunyanClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVueWFuQ2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2J1bnlhbkNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSwrQ0FBaUM7QUFFakMsSUFBSSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUNoRSxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQzdDLElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQy9DLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztBQUUvRCxNQUFhLFlBQVk7SUFVdkIsWUFBWSxXQUFtQixFQUFFLE9BQW9CO1FBQ2pELE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksSUFBSSxpQkFBaUIsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssR0FBSSxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDO1FBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUM7UUFDN0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLElBQUksT0FBTyxDQUFDO1FBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUc7WUFDaEIsTUFBTSxFQUFFLFNBQVM7U0FDbEIsQ0FBQTtRQUNELElBQUcsT0FBTyxDQUFDLFVBQVUsRUFB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