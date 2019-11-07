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
var S3StreamLogger = require('s3-streamlogger-daily').S3StreamLogger;
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
            target: 'local'
        };
        if (options.streamInfo) {
            if (options.streamInfo.target == 's3') {
                if (options.streamInfo.bucket && options.streamInfo.access_key_id && options.streamInfo.secret_access_key) {
                    this.streamInfo = options.streamInfo;
                    console.log('-----------------Stream Info set to S3...2.0.13');
                }
            }
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
        console.log('Meth: getStreamObj();');
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
                // there was an error!
                console.log('BUNYANCLIENT - S3 logger - Failure', err);
            });
        }
        else {
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
        return stream;
    }
}
exports.BunyanClient = BunyanClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVueWFuQ2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2J1bnlhbkNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSwrQ0FBaUM7QUFFakMsSUFBSSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUNoRSxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQzdDLElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQy9DLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztBQUVyRSxNQUFhLFlBQVk7SUFVdkIsWUFBWSxXQUFtQixFQUFFLE9BQW9CO1FBQ2pELE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksSUFBSSxpQkFBaUIsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssR0FBSSxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDO1FBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUM7UUFDN0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLElBQUksT0FBTyxDQUFDO1FBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUc7WUFDaEIsTUFBTSxFQUFFLE9BQU87U0FDaEIsQ0FBQTtRQUNELElBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRTtZQUNuQixJQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLElBQUksRUFBRTtnQkFDbEMsSUFBRyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFDO29CQUN2RyxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7b0JBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaURBQWlELENBQUMsQ0FBQztpQkFDaEU7YUFDSjtTQUNKO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELFlBQVk7UUFDUixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLG1FQUFtRSxDQUFDLENBQUM7WUFDakYsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3RCO2FBQU07WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDZEQUE2RCxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO2dCQUM5QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsV0FBVyxFQUFFO29CQUNULEdBQUcsRUFBRSxJQUFJLGFBQWEsRUFBRSxDQUFDLEdBQUc7b0JBQzVCLEdBQUcsRUFBRSxJQUFJLGFBQWEsRUFBRSxDQUFDLEdBQUc7b0JBQzVCLEdBQUcsRUFBRSxJQUFJLGFBQWEsRUFBRSxDQUFDLEdBQUc7aUJBQy9CO2dCQUNELE9BQU8sRUFBRTtvQkFDTDt3QkFDSSxLQUFLLEVBQUUsRUFBRTt3QkFDVCxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7cUJBQ3BDO29CQUNEO3dCQUNJLEtBQUssRUFBRSxFQUFFO3dCQUNULE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztxQkFDckM7b0JBQ0Q7d0JBQ0ksS0FBSyxFQUFFLEVBQUU7d0JBQ1QsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO3FCQUNyQztvQkFDRDt3QkFDSSxLQUFLLEVBQUUsRUFBRTt3QkFDVCxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7cUJBQ3JDO29CQUNEO3dCQUNJLEtBQUssRUFBRSxFQUFFO3dCQUNULE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztxQkFDcEM7b0JBQ0Q7d0JBQ0ksS0FBSyxFQUFFLEVBQUU7d0JBQ1QsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO3FCQUNyQztpQkFDSjthQUNKLENBQUMsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUN0QjtJQUNMLENBQUM7SUFFRCxZQUFZLENBQUMsVUFBa0I7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3JDLElBQUksTUFBbUIsQ0FBQztRQUN4QixJQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLElBQUksRUFBRTtZQUMvQixJQUFJLFlBQVksR0FBZ0I7Z0JBQzVCLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU07Z0JBQzlCLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWE7Z0JBQzVDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCO2dCQUNwRCxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixJQUFJLHNCQUFzQixDQUFDLEdBQUcsSUFBSSxVQUFVLE1BQU07Z0JBQ2xHLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksSUFBSSxLQUFLO2dCQUNuRCxZQUFZLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksRUFBRSxHQUFDLElBQUksQ0FBQyxZQUFZO2FBQ3JFLENBQUM7WUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFTLEdBQWM7Z0JBQ3hDLHNCQUFzQjtnQkFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztTQUNKO2FBQU07WUFDSCxJQUFJLFlBQVksR0FBZ0I7Z0JBQzVCLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsVUFBVSxNQUFNO2dCQUM1QyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDdEIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixJQUFJLEVBQUUsS0FBSztnQkFDWCxNQUFNLEVBQUUsSUFBSTthQUNmLENBQUE7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sR0FBRyxJQUFJLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQ2pEO1FBQ0gsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBL0dELG9DQStHQyJ9