"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bunyanClient_1 = require("./bunyanClient");
let globals = require('../globals');
const DEFAULT_LOG_ROOT_PATH = require('app-root-path') + '/logs/';
let CUSTOM_LEVELS = {
    SECURITY_ERROR: 61,
    SECURITY_INFO: 31,
    NOTICE: 41,
    SERIOUS_ERROR: 55,
    VALIDATION_ERROR: 45
};
class FlclLogger {
    constructor(options) {
        if (!options.logRootPath)
            options.logRootPath = DEFAULT_LOG_ROOT_PATH;
        if (options.requestId)
            this.setRequestId(options.requestId);
        if (options.rootRequestId)
            this.rootRequestId = options.rootRequestId;
        if (options.forwardedRequestId)
            this.forwardedRequestId = options.forwardedRequestId;
        if (options.errorMsgCategoryList)
            globals.errorMsgCategoryList = options.errorMsgCategoryList;
        this.logger = new bunyanClient_1.BunyanClient(options.logRootPath, options).createLogger();
        this.info({ identifier: 'flclLogger-instance', propertyName: 'Logger Instantiation', data: { msg: 'New Flcl-logger instance has been created!' } });
        this.bindCustomLevelLogs();
    }
    bindCustomLevelLogs() {
        this.logger.notice = this.getCustomLevel(CUSTOM_LEVELS.NOTICE);
        this.logger.securityError = this.getCustomLevel(CUSTOM_LEVELS.SECURITY_ERROR);
        this.logger.securityInfo = this.getCustomLevel(CUSTOM_LEVELS.SECURITY_INFO);
        this.logger.criticalError = this.getCustomLevel(CUSTOM_LEVELS.SERIOUS_ERROR);
        this.logger.validationError = this.getCustomLevel(CUSTOM_LEVELS.VALIDATION_ERROR);
    }
    getCustomLevel(level) {
        return (msg, ...args) => {
            let theArgs;
            if (typeof msg === 'string') {
                theArgs = Object.assign({ level: level, msg }, args);
            }
            else if (typeof msg === 'object') {
                theArgs = Object.assign(Object.assign({ level: level }, msg), args);
            }
            else {
                throw new Error('Invalid arguments provided');
            }
            if (theArgs)
                this.logger.fatal(theArgs);
        };
    }
    setRequestId(requestId) {
        this.requestId = requestId;
    }
    getRequestId() {
        return this.requestId;
    }
    getrootRequestId() {
        return this.rootRequestId;
    }
    getForwardedRequestId() {
        return this.forwardedRequestId;
    }
    structurizeArg(data) {
        try {
            let requestId = this.getRequestId();
            let rootRequestId = this.getrootRequestId();
            let forwardedRequestId = this.getForwardedRequestId();
            if (data) {
                if (typeof data == 'object') {
                    data = this.cleanObj(data);
                    data.requestId = requestId;
                    data.rootRequestId = rootRequestId;
                    data.forwardedRequestId = forwardedRequestId;
                }
                else if (typeof data == 'string' || typeof data == 'number') {
                    let msgText = data;
                    data = {
                        FlclMsg: msgText,
                        requestId: requestId,
                        rootRequestId: rootRequestId,
                        forwardedRequestId: forwardedRequestId
                    };
                }
                ;
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            return data;
        }
        ;
    }
    cleanObj(data) {
        let cleanedObj = {};
        try {
            /**
             * The 'data' might have 'non-enumerable' properties.
             * The normal loop methods like 'forLoop' or '_.each" will not look on the non-enumerable properties, and hence those properties will get skipped in our log information.
             * Hence, we are Iterating 'data' using Object.getOwnPropertyNames().forEach(()=>{}) syntax (to iterate over non-enumerable properties as well)
             * Ex: 'FlclError' object instance has a property named 'stack', which is non-enumerable
             */
            Object.getOwnPropertyNames(data).forEach((key) => {
                let propVal = data[key];
                if (this.displayInRootLevel(key)) {
                    if (typeof propVal == 'object' && this.canStringify(key))
                        cleanedObj[key] = this._getStringified(propVal);
                    else
                        cleanedObj[key] = propVal;
                }
                else {
                    cleanedObj.FlclMsg = cleanedObj.FlclMsg || {};
                    cleanedObj.FlclMsg[key] = propVal;
                }
            });
            cleanedObj.FlclMsg = this._getStringified(cleanedObj.FlclMsg);
        }
        catch (e) {
            cleanedObj['logdata-parse-error'] = true;
            cleanedObj['logdata-parse-error-msg'] = e.message;
            cleanedObj['logdata-parse-error-stack'] = e.stack;
        }
        finally {
            return cleanedObj;
        }
    }
    _getStringified(jsonObj) {
        let stringified = '';
        try {
            stringified = JSON.stringify(jsonObj, FlclLogger.replacer, 4);
        }
        catch (e) {
            if (jsonObj && jsonObj.response && jsonObj.response.data) {
                stringified = this._getStringified(jsonObj.response.data);
            }
            else {
                stringified = JSON.stringify({ identifier: 'INVALID_JSON_CIRCULAR_JSON', message: jsonObj.message || 'This is circular json. Could not able to convert', stackTrace: this._getStackTrace() }, FlclLogger.replacer, 4);
            }
        }
        finally {
            return stringified;
        }
    }
    static replacer(key, data) {
        /**
         * ERROR object is non-enumerable, and JSON.stringify() could not able to return stringified version of it.
         * So, using Object.getOwnPropertyNames().forEach(()=>{}), cloning its non-enumerable properties into other object as enumerable properties, and returning that new object.
         */
        if (data instanceof Error) {
            let cleanData = {};
            Object.getOwnPropertyNames(data).forEach((key) => {
                cleanData[key] = data[key];
            });
            data = cleanData;
        }
        else if (typeof data === 'string') { // If its already stringified object, then parse it(since the parent stringify will take care of stringifying it)
            try {
                data = JSON.parse(data);
            }
            catch (e) {
                data = data;
            }
        }
        return data;
    }
    displayInRootLevel(key) {
        let rootLevels = [
            'userAgent', 'host',
            'req', 'res', 'err',
            'appId', 'userId', 'customerName', 'companyName', 'customerId', 'companyName', 'orderReference', 'fromCity', 'fromCountry', 'toCity', 'toCountry', 'route', 'FlclMsg',
            'className', 'class', 'methodName', 'propertyValue', 'propertyName', 'level',
            'requestId', 'rootRequestId', 'forwardedRequestId', 'earlierRequestId', 'isNewRequest', 'isEndOfResponse', 'inTime', 'inTimeDate', 'elapsedTime',
            'workerName', 'action',
            'errorType', 'identifier', 'carrierList', 'carrierList2', 'rateAPIFlag', 'rateEntryLog',
            'newOrder', 'orderRateProvider', 'orderGateway', 'processedOrderStatus', 'usedFlavorCloudRate', 'carrier', 'shippingLineDetail', 'order',
            'shipmentLogContext', 'browserLog', 'severity', 'msgFromContext4', 'xShopifyOrderId', 'xShopifyDomain', 'xShopifyTopic', 'awsRequestId'
        ];
        if (rootLevels.indexOf(key) != -1)
            return true;
        else
            return false;
    }
    canStringify(key) {
        let stringifyProps = [
            'propertyValue',
        ];
        if (stringifyProps.indexOf(key) != -1)
            return true;
        else
            return false;
    }
    _getStackTrace() {
        let obj = {};
        Error.captureStackTrace(obj, this._getStackTrace);
        return obj.stack;
    }
    trace(args) {
        this.logger.trace(this.structurizeArg(args));
    }
    debug(args) {
        this.logger.debug(this.structurizeArg(args));
    }
    info(args) {
        this.logger.info(this.structurizeArg(args));
    }
    warn(args) {
        this.logger.warn(this.structurizeArg(args));
    }
    error(args) {
        if (args && args.errorType == 'critical' || (this.flclMsgController && this.flclMsgController.isCriticalError(args)))
            this.critical(args);
        else if (args && args.errorType == 'validation' || (this.flclMsgController && this.flclMsgController.isValidationError(args)))
            this.validation(args);
        else
            this.logger.error(this.structurizeArg(args));
    }
    validation(args) {
        this.logger.validationError(this.structurizeArg(args));
    }
    critical(args) {
        this.logger.criticalError(this.structurizeArg(args));
    }
    fatal(args) {
        this.logger.fatal(this.structurizeArg(args));
    }
}
exports.FlclLogger = FlclLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxjbExvZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mbGNsTG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaURBQThDO0FBQzlDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNwQyxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxRQUFRLENBQUM7QUFJbEUsSUFBSSxhQUFhLEdBQUc7SUFDbEIsY0FBYyxFQUFFLEVBQUU7SUFDbEIsYUFBYSxFQUFFLEVBQUU7SUFDakIsTUFBTSxFQUFFLEVBQUU7SUFDVixhQUFhLEVBQUUsRUFBRTtJQUNqQixnQkFBZ0IsRUFBRSxFQUFFO0NBQ3JCLENBQUM7QUFFRixNQUFhLFVBQVU7SUFNckIsWUFBWSxPQUFvQjtRQUM1QixJQUFHLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkIsT0FBTyxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztRQUNoRCxJQUFHLE9BQU8sQ0FBQyxTQUFTO1lBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLElBQUcsT0FBTyxDQUFDLGVBQWU7WUFDdEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO1FBQ25ELElBQUcsT0FBTyxDQUFDLGtCQUFrQjtZQUN6QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBRXpELElBQUcsT0FBTyxDQUFDLG9CQUFvQjtZQUMzQixPQUFPLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDO1FBRWhFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSwyQkFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDNUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVB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