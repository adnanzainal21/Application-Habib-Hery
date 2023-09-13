
(function(root, undefined) 
	var lib = {};
	lib.version = '0.4.2';
	lib.settings = {
		currency: {
			symbol : "$",		
			format : "%s%v",	
			decimal : ".",		
			thousand : ",",		
			precision : 2,		
			grouping : 3		
		},
		number: {
			precision : 0,		
			grouping : 3,		
			thousand : ",",
			decimal : "."
		}
	};

	var nativeMap = Array.prototype.map,
		nativeIsArray = Array.isArray,
		toString = Object.prototype.toString;
	function isString(obj) {
		return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
	}


	function isArray(obj) {
		return nativeIsArray ? nativeIsArray(obj) : toString.call(obj) === '[object Array]';
	}

	
	function isObject(obj) {
		return obj && toString.call(obj) === '[object Object]';
	}


	function defaults(object, defs) {
		var key;
		object = object || {};
		defs = defs || {};
		for (key in defs) {
			if (defs.hasOwnProperty(key)) {
				if (object[key] == null) object[key] = defs[key];
			}
		}
		return object;
	}

	
	function map(obj, iterator, context) {
		var results = [], i, j;
		if (!obj) return results;
		if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
		for (i = 0, j = obj.length; i < j; i++ ) {
			results[i] = iterator.call(context, obj[i], i, obj);
		}
		return results;
	}
	function checkPrecision(val, base) {
		val = Math.round(Math.abs(val));
		return isNaN(val)? base : val;
	}


	function checkCurrencyFormat(format) {
		var defaults = lib.settings.currency.format;
		if ( typeof format === "function" ) format = format();
		if ( isString( format ) && format.match("%v") ) {
			return {
				pos : format,
				neg : format.replace("-", "").replace("%v", "-%v"),
				zero : format
			};
		} else if ( !format || !format.pos || !format.pos.match("%v") ) {
			return ( !isString( defaults ) ) ? defaults : lib.settings.currency.format = {
				pos : defaults,
				neg : defaults.replace("%v", "-%v"),
				zero : defaults
			};

		}
		return format;
	}


	var unformat = lib.unformat = lib.parse = function(value, decimal) {
		if (isArray(value)) {
			return map(value, function(val) {
				return unformat(val, decimal);
			});
		}
		value = value || 0;
		if (typeof value === "number") return value;
		decimal = decimal || lib.settings.number.decimal;
		var regex = new RegExp("[^0-9-" + decimal + "]", ["g"]),
			unformatted = parseFloat(
				("" + value)
				.replace(/\((?=\d+)(.*)\)/, "-$1")  
				.replace(regex, '')          
				.replace(decimal, '.')      
			);
		return !isNaN(unformatted) ? unformatted : 0;
	};

	var toFixed = lib.toFixed = function(value, precision) {
		precision = checkPrecision(precision, lib.settings.number.precision);

		var exponentialForm = Number(lib.unformat(value) + 'e' + precision);
		var rounded = Math.round(exponentialForm);
		var finalResult = Number(rounded + 'e-' + precision).toFixed(precision);
		return finalResult;
	};

	var formatNumber = lib.formatNumber = lib.format = function(number, precision, thousand, decimal) {
		if (isArray(number)) {
			return map(number, function(val) {
				return formatNumber(val, precision, thousand, decimal);
			});
		}

		number = unformat(number);
		var opts = defaults(
				(isObject(precision) ? precision : {
					precision : precision,
					thousand : thousand,
					decimal : decimal
				}),
				lib.settings.number
			),
			usePrecision = checkPrecision(opts.precision),
			negative = number < 0 ? "-" : "",
			base = parseInt(toFixed(Math.abs(number || 0), usePrecision), 10) + "",
			mod = base.length > 3 ? base.length % 3 : 0;
		return negative + (mod ? base.substr(0, mod) + opts.thousand : "") + base.substr(mod).replace(/(\d{3})(?=\d)/g, "$1" + opts.thousand) + (usePrecision ? opts.decimal + toFixed(Math.abs(number), usePrecision).split('.')[1] : "");
	};


	var formatMoney = lib.formatMoney = function(number, symbol, precision, thousand, decimal, format) {
		if (isArray(number)) {
			return map(number, function(val){
				return formatMoney(val, symbol, precision, thousand, decimal, format);
			});
		}

		number = unformat(number);
		var opts = defaults(
				(isObject(symbol) ? symbol : {
					symbol : symbol,
					precision : precision,
					thousand : thousand,
					decimal : decimal,
					format : format
				}),
				lib.settings.currency
			),

			formats = checkCurrencyFormat(opts.format),
			useFormat = number > 0 ? formats.pos : number < 0 ? formats.neg : formats.zero;
		return useFormat.replace('%s', opts.symbol).replace('%v', formatNumber(Math.abs(number), checkPrecision(opts.precision), opts.thousand, opts.decimal));
	};


	lib.formatColumn = function(list, symbol, precision, thousand, decimal, format) {
		if (!list || !isArray(list)) return [];
		var opts = defaults(
				(isObject(symbol) ? symbol : {
					symbol : symbol,
					precision : precision,
					thousand : thousand,
					decimal : decimal,
					format : format
				}),
				lib.settings.currency
			),
			formats = checkCurrencyFormat(opts.format),
			padAfterSymbol = formats.pos.indexOf("%s") < formats.pos.indexOf("%v") ? true : false,
			maxLength = 0,
			formatted = map(list, function(val, i) {
				if (isArray(val)) {
					return lib.formatColumn(val, opts);
				} else {
					val = unformat(val);
					var useFormat = val > 0 ? formats.pos : val < 0 ? formats.neg : formats.zero,
						fVal = useFormat.replace('%s', opts.symbol).replace('%v', formatNumber(Math.abs(val), checkPrecision(opts.precision), opts.thousand, opts.decimal));
					if (fVal.length > maxLength) maxLength = fVal.length;
					return fVal;
				}
			});
		return map(formatted, function(val, i) {
			if (isString(val) && val.length < maxLength) {
				return padAfterSymbol ? val.replace(opts.symbol, opts.symbol+(new Array(maxLength - val.length + 1).join(" "))) : (new Array(maxLength - val.length + 1).join(" ")) + val;
			}
			return val;
		});
	};

	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = lib;
		}
		exports.accounting = lib;
	} else if (typeof define === 'function' && define.amd) {
		define([], function() {
			return lib;
		});
	} else {

		lib.noConflict = (function(oldAccounting) {
			return function() {
				root.accounting = oldAccounting;
				lib.noConflict = undefined;
				return lib;
			};
		})(root.accounting);
		root['accounting'] = lib;
	}
}(this));


	if (typeof exports !== 'undefined') {
		if ( this.accounting)
	}