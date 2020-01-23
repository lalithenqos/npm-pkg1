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
        if (options.parentRequestId)
            this.parentRequestId = options.parentRequestId;
        if (options.forwardedRequestId)
            this.forwardedRequestId = options.forwardedRequestId;
        if (options.errorMsgCategoryList)
            globals.errorMsgCategoryList = options.errorMsgCategoryList;
        this.logger = new bunyanClient_1.BunyanClient(options.logRootPath, options).createLogger();
        this.info({ identifier: 'flclLogger-instance', data: { msg: 'New Flcl-logger instance has been created!' } });
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
    getParentRequestId() {
        return this.parentRequestId;
    }
    getForwardedRequestId() {
        return this.forwardedRequestId;
    }
    structurizeArg(data) {
        try {
            let requestId = this.getRequestId();
            let parentRequestId = this.getParentRequestId();
            let forwardedRequestId = this.getForwardedRequestId();
            if (data) {
                if (typeof data == 'object') {
                    data = this.cleanObj(data);
                    data.requestId = requestId;
                    data.parentRequestId = parentRequestId;
                    data.forwardedRequestId = forwardedRequestId;
                }
                else if (typeof data == 'string' || typeof data == 'number') {
                    let msgText = data;
                    data = {
                        FlclMsg: msgText,
                        requestId: requestId,
                        parentRequestId: parentRequestId,
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
            'requestId', 'parentRequestId', 'forwardedRequestId', 'earlierRequestId', 'isNewRequest', 'isEndOfResponse', 'inTime', 'inTimeDate', 'elapsedTime',
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