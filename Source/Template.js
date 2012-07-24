/*
---
script: template.js
license: MIT-style license.
description: Template - context aware template engine with conditional replacement, iterations and filters.
copyright: Copyright (c) 2011 Thierry Bela
authors: [Thierry Bela]

requires: 
  core:1.3: 
  - Object
  - Array
  - Elements.from
  
provides: [Template]
...
*/

!function (window, undef) {

"use strict";

	var log = (function () { return window.console && console.log ? function () { console.log.apply(console, arguments) } : function () { } })(),
		cache = {}, 
		Object = window.Object,
		append = 'append',
		filters = 'filters',
		indexOf = 'indexOf',
		join = 'join',
		modifiers = 'modifiers',
		push = 'push',
		replace = 'replace',
		shift = 'shift',
		split = 'split',
		substring = 'substring',
		Template = window.Template = function (options) { 
		
			this.initialize(options); 
			return this
		},
		UID = 0;
		
	Template.prototype = {

	/*
		options: {

			begin: '{',
			end: '}',
			debug: false,
			// parse: function () {},
			escape: false, // escape strings by default
			quote: false // escape quotes
		},
	*/
		filters: {},
		modifiers: {

			/* explicitely escape string */
			escape: function (context, property, quote) {

				var options = {escape: true, quote: quote};
				return property.indexOf('.') == -1 ? evaluate(context, options, property) : nestedeval(context, options, property.split('.'))
			},
			/* do not escape string */
			raw: function (context, property, quote) {

				var options = {};
				return property.indexOf('.') == -1 ? evaluate(context, options, property) : nestedeval(context, options, property.split('.'))
			}
		},		
		UID: 0,
		initialize: function (options) { 
		
			this.options = Object[append]({}, options);
			this.UID = UID++;
			cache[this.UID] = {}
		},		
		setOptions: function (options) {
		
			if(options) Object[append](this.options, options);
			
			delete cache[this.UID];
			this.UID = UID++;
			cache[this.UID] = {};
			
			return this
		},
		addFilter: function (name, fn) {
		
			if(typeof name == 'object') Object[append](this[filters], name);
			else this[filters][name] = fn;
			
			delete cache[this.UID];
			this.UID = UID++;
			cache[this.UID] = {};
			
			return this
		},		
		addModifier: function (name, fn) {
		
			if(typeof name == 'object') Object[append](this[modifiers], name);
			else this[modifiers][name] = fn;
			
			delete cache[this.UID];
			this.UID = UID++;
			cache[this.UID] = {};
			
			return this
		},		
		html: function (template, data) { return Elements.from(this.substitute(template, data)) },	
		compile: function (template, options) {
		
			if(cache[this.UID][template]) return cache[this.UID][template];
			if(options && options != this.options) this.setOptions(options);
			
			return compile(template, Object[append]({}, this.options, {filters: this[filters], modifiers: this[modifiers]}), this.UID);
		},
		substitute: function (template, data) {
		
			if(!cache[this.UID][template]) this.compile(template);
			return cache[this.UID][template](data)
		}	
	};

	function escape(string, quote) {
	
		var escaped = ('' + string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		
		return quote ? escaped.replace(/"/g, '&quot;').replace(/'/g, '&apos;') : escaped
	}
	
	function compile(template, options, UID) {

		if(cache[UID][template]) return cache[UID][template];
		
		cache[UID][template] = parse(template, options, UID + '');
		
		return cache[UID][template]
	}
	
	function parse(template, options, UID) {
	
		var state = {},
			fn,
			result = inline(template, options, UID, [], [], state);
			
		if(!state.iterable) {
		
			fn = new Function('data,options,evaluate,nestedeval,tmp,undef', 'return ' + result[join]('+')[replace](/html\+=/g, ''));
			return function (data, html) { return html ? Elements.from(fn(data, options, evaluate, nestedeval)) : fn(data, options, evaluate, nestedeval) }
		} 
	
		fn = new Function('data,options,compile,conditional,test,evaluate,nestedeval,iterate,log,stack,buffer,filters,tmp,undef', ('var html = "";' + result[join](';') + ';return html')[replace]('html = "";html+="', 'html = "'));
		
		return function (data, html) {
		
			return html ? Elements.from(fn(data,options,compile,conditional,test,evaluate,nestedeval,iterate,log,[],[],[])) : fn(data,options,compile,conditional,test,evaluate,nestedeval,iterate,log,[],[],[])
		}
	}
	
	function inline(template, options, UID, stack, buffer, state) {
	
		var level = stack.length,
			index,
			cIndex,
			cTagIndex,
			string = '',
			match,
			oTag,
			cTag,
			tag,
			name,
			_filters,
			substr,
			original = template,
			begin = options.begin || '{',
			end = options.end || '}',
			length = begin.length,
			_modifiers = options[modifiers] || {};
		
		do {
		
			_filters = [];
			index = template[indexOf](begin);
			cIndex = template[indexOf](end, index);
			
			if(index != -1 && cIndex != -1) {
			
				if(template.charAt(index - 1) == '\\') {
				
					string = template[substring](0, cIndex + length);
					
					buffer[push]('html+=' + quote(template[substring](0, index - 1) + template[substring](index, cIndex + length)));
					template = template[replace](string, '');
					continue;
				}
				
				oTag = template[substring](index, cIndex + length);
				string = template[substring](0, index);
				match = template[substring](index + length, cIndex);
				
				if(match[indexOf](':') == -1) {
				
					name = match;
					if(match[indexOf](' ') != -1) {
						
						_filters = match[split](' ');
						name = _filters[shift]();
					}
					
					match = quote(name);
					stack[append](name == '.' || name[indexOf]('.') == -1 ? [name] : name[split]('.'));
					
					buffer[push]('html+=' + quote(string));
					
					if(_modifiers[name]) buffer[push]('html+=' + '((tmp=options.modifiers[' + match + '](data' + (_filters && _filters.length > 0 ? ',' + quote(_filters) : '') + '))||tmp!=undef?tmp:"")');
					else buffer[push]('html+=' + (stack.length <= 1 ? 'evaluate' : 'nestedeval') + '(data,options,' + (stack.length <= 1 ? quote(stack) : '[' + quote(stack) + ']') + ')');
					
					template = template[replace](string + oTag, '');
					stack = stack.slice(0, level)
				}
				
				else {
				
					buffer[push]('html+=' + quote(string));
					
					_filters = match[split](':');
					tag = _filters[shift]();

					if(_filters[0].charAt(0) == ' ') {
					
						name = '';
						_filters = _filters[join](' ')[split](' ');
					} 
					else {
					
						_filters = _filters[join](' ')[split](' ');
						name = _filters[shift]();
					}
					
					if(_filters.length > 0) _filters = _filters.filter(function (filter) { return filter !== '' })
					
					match = quote(name);
					
					cTag = begin + '/' + tag + ':' + name + end;
					
					cTagIndex = template[indexOf](cTag);
					
					if(cTagIndex == -1) {
					
						log('token ' + oTag  + ' is not closed properly: "' + template[substring](0, cIndex + 1) + '"\n' + original);
						template = template[replace](oTag, '');
						continue;
					}
			
					state.iterable = true;
					substr = template[substring](index + oTag.length, cTagIndex);
					template = template[replace](template[substring](0, cTagIndex + cTag.length), '');
					
					switch(tag) {
					
						case 'if':
						case 'defined':
						case 'empty':
						case 'not-empty':

							var elseif = begin + 'else:' + name + end;
							name = name[split]('.');
								
							buffer[push]('stack.push(data)',
										'data=' + (name.length <= 1 ? 'evaluate(data,options,' + quote(name) + ',true)' : 'nestedeval(data,options,[' + quote(name) + '],true)'),
										'filters=[' + quote(_filters) + ']',
										'html+=conditional([' + quote(substr[split](elseif)) + '],options,' + quote(UID) + ',test(' + quote(tag) + ',data),' + (tag == 'if' ? 'typeof data == "object"' : 'false') + ',data,stack[stack.length-1],filters)',
										'data=stack.pop()'
									);
							break;
							
						case 'loop':
						case 'repeat':
						
							if(tag == 'repeat') {
								
								name = name[split]('.');
								buffer[push]('stack.push(data);data=' + (name.length <= 1 ? 'evaluate(data,options,' + quote(name) + ')' : 'nestedeval(data,options,[' + quote(name) + '])'));
							}
						
							if(_filters.length > 0) buffer[push](
							
								'filters=[' + quote(_filters) + ']', 
								'for(tmp=0;tmp<filters.length;tmp++)if(options.filters[filters[tmp]]!=undef)data=options.filters[filters[tmp]](data)'
							);
							
							buffer[push]('if(typeof data == "object") html+=iterate(' + quote(substr) + ',Object.keys(data),options,' + quote(UID) + ',data)');
							if(tag == 'repeat') buffer[push]('data=stack.pop()');
							break;
							
						default:
						
							buffer[push]('tmp=options.parse!=undef?options.parse(' + quote(tag, name, substr) + ',data,options,filters) : ' + quote(substr),
										'if(options.parse == undef) log("unknown tag: ",' + quote(tag, name, substr, original) + ')',
										'html+=tmp==undef?"":tmp'
									);
							break;
					}
				}
			}
		}
		
		while(index != -1 && cIndex != -1);
		
		if(template !== '') buffer[push]('html+=' + quote(template));
		
		return buffer.filter(function (string) { return string !== '' && string != '""' });
	}
			
	function conditional(templates, options, UID, test, swap, data, context, _filters) {
	
		var value = templates.length == 2 ? (test && swap ? data : context) : (!test ? undef : (swap ? data : context));
		
		if(_filters && value != undef) for(var i = 0; i < _filters.length; i++) value = options[filters][_filters[i]](value);
		
		if(templates.length == 2) return compile(templates[!test ? 1 : 0], options, UID)(value);
		
		if(!test) return '';
	
		return compile(templates[0], options, UID)(value)
	}
	
	function iterate(template, keys, options, UID, data) {
	
		var render = compile(template, options, UID),key,html='';
		
		for(key = 0; key < keys.length; key++) html += render(evaluate(data,options,keys[key]));
			
		return html
	}
	
	function evaluate (object, options, property, raw) {
 
		var value;

		if(property == '.' || property === '') value = object;
		else value = typeof object[property] == 'function' ? object[property]() : object[property];
		
		if(raw) return value;
		if(value != undef) return options.escape ? escape(value, options.quote) : value;
		return ''
	}
	
	function nestedeval (object, options, paths, raw) {
	
		var value = object, key, i;
		
		for(i = 0; i < paths.length; i++) {
		
			key = paths[i];
			
			if(value[key] == undef) return raw ? undef : '';
			
			value = typeof value[key] == 'function' ? value[key]() : value[key]
		}
		
		if(raw) return value;
		if(value != undef) return options.escape ? escape(value, options.quote) : value;
		return ''
	}
		
	function test (tag, value) {

		switch(tag) {
		
			case 'if':
			case 'not-empty':
					return value != false && value != undef;
					
			case 'defined':
					return value != undef;
			case 'empty':
					return value == false || value == undef;
					
			case 'loop':
			case 'repeat':
					return typeof value == 'object';
		}
		
		return true
	}
	
	function quote() { 
	
		return Array.flatten(arguments).map(function (string) { 
			return '"' + ('' + string)[replace](/(["\\])/g, '\\$1')[replace](/\n/g, '\\n') + '"' 
		})
	}
	
}(this, null);
