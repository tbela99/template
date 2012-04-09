/*
---
script: template.js
license: MIT-style license.
description: Template - context aware template engine with conditional replacement, iterations and filters.
copyright: Copyright (c) 2011 Thierry Bela
authors: [Thierry Bela]

requires: 
  core:1.3: 
  - Class
  - Elements.from
  
provides: [Template]
...
*/

!function (window, undef) {

"use strict";

	var log = (function () { return window.console && console.log ? function () { console.log.apply(console, arguments) } : function () { } })(),
		cache = {}, 
		Object = window.Object,
		Template = window.Template = function (options) { 
		
			this.initialize(options); 
			return this
		};
		
	Template.prototype = {

		cache: {},
		filters: {},
		modifiers: {},		
		hash: '',
		initialize: function (options) { 
		
			this.options = Object.append({}, options);
			this.hash = Object.values(this.options)
		},		
		addFilter: function (name, fn) {
		
			if(typeof name == 'object') Object.each(name, function (value, name) { this.filters[name] = value }, this);
			
			else this.filters[name] = fn;
			
			this.hash = Object.values(this.options) + Object.values(this.filters) + Object.values(this.modifiers);
			return this
		},		
		addModifier: function (name, fn) {
		
			if(typeof name == 'object') Object.each(name, function (value, name) { 
				
				this.modifiers[name] = function () {
			
					var value = fn.apply(undef, arguments);
					
					return value == undef ? '' : value
				}
				
			}, this);
			
			else this.modifiers[name] = function () {
			
				var value = fn.apply(undef, arguments);
				
				return value == undef ? '' : value
			};
			
			this.hash = Object.values(this.options) + Object.values(this.filters) + Object.values(this.modifiers);
			return this
		},		
		html: function (template, data, options) { return Elements.from(this.substitute(template, data, options)) },	
		compile: function (template, options) {
		
			if(options != undef || !this.cache[template + this.hash]) {
				
				Object.append(this.options, options);
				this.hash = Object.values(this.options) + Object.values(this.filters) + Object.values(this.modifiers) + Object.values(options || {});
				options = Object.append({}, this.options, {filters: this.filters, modifiers: this.modifiers});
			} 
			
			if(this.cache[template + this.hash]) return this.cache[template + this.hash];

			this.cache[template + this.hash] = compile(template, options || {}, this.hash);
			return this.cache[template + this.hash];
		},
		substitute: function (template, data, options) {
		
			return this.compile(template, options)(data)
		}	
	};

	function compile(template, options, hash) {

		if(cache[template + hash]) return cache[template + hash];
		
		cache[template + hash] = parse(template, options, hash + '');
		
		return cache[template + hash]
	}
	
	function parse(template, options) {
	
		var state = {},
			fn,
			result = inline(template, options, [], [], state);
			
		if(!state.iterable) {
		
			fn = new Function('data','options', 'evaluate', 'nestedeval', 'return ' + result.join('+').replace(/html\+=/g, ''));
			return function (data) { return fn(data, options, evaluate, nestedeval) }
		} 
	
		fn = new Function('data,options,compile,conditional,test,evaluate,nestedeval,iterate,log,stack,buffer,filters,tmp,undef', ('var html = "";' + result.join(';') + ';return html').replace('html = "";html+="', 'html = "'));
		
		return function (data) {
		
			return fn(data,options,compile,conditional,test,evaluate,nestedeval,iterate,log,[],[],[])
		}
	}
	
	function inline(template, options, stack, buffer, state) {
	
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
			filters,
			substring,
			original = template,
			begin = options.begin || '{',
			end = options.end || '}',
			length = begin.length,
			modifiers = options.modifiers || {};
		
		do {
		
			filters = [];
			index = template.indexOf(begin);
			cIndex = template.indexOf(end, index);
			
			if(index != -1 && cIndex != -1) {
			
				if(template.charAt(index - 1) == '\\') {
				
					string = template.substring(0, cIndex + length);
					
					buffer.push('html+=' + quote(template.substring(0, index - 1) + template.substring(index, cIndex + length)));
					template = template.replace(string, '');
					continue;
				}
				
				oTag = template.substring(index, cIndex + length);
				string = template.substring(0, index);
				match = template.substring(index + length, cIndex);
				
				if(match.indexOf(':') == -1) {
				
					name = match;
					if(match.indexOf(' ') != -1) {
						
						filters = match.split(' ');
						name = filters.shift();
					}
					
					match = quote(name);
					stack.append(name == '.' || name.indexOf('.') == -1 ? [name] : name.split('.'));
					
					buffer.push('html+=' + quote(string));
					
					if(modifiers[name]) buffer.push('html+=' + 'options.modifiers[' + match + '](data' + (filters && filters.length > 0 ? ',' + quote(filters) : '') + ')');
					else buffer.push('html+=' + (stack.length <= 1 ? 'evaluate' : 'nestedeval') + '(data,' + (stack.length <= 1 ? quote(stack) : '[' + quote(stack) + ']') + ')');
					
					template = template.replace(string + oTag, '');
					stack = stack.slice(0, level)
				}
				
				else {
				
					buffer.push('html+=' + quote(string));
					
					filters = match.split(':');
					tag = filters.shift();
					if(filters[0].charAt(0) == ' ') {
					
						name = '';
						filters = filters.join(' ').split(' ');
					} 
					else {
					
						filters = filters.join(' ').split(' ');
						name = filters.shift();
					}
					
					if(filters.length > 0) filters = filters.filter(function (filter) { return filter !== '' })
					
					match = quote(name);
					
					cTag = begin + '/' + tag + ':' + name + end;
					
					cTagIndex = template.indexOf(cTag);
					
					if(cTagIndex == -1) {
					
						log('token ' + oTag  + ' is not closed properly: "' + template.substring(0, cIndex + 1) + '"\n' + original);
						template = template.replace(oTag, '');
						continue;
					}
			
					state.iterable = true;
					substring = template.substring(index + oTag.length, cTagIndex);
					template = template.replace(template.substring(0, cTagIndex + cTag.length), '');
					
					switch(tag) {
					
						case 'if':
						case 'defined':
						case 'empty':
						case 'not-empty':

							var elseif = begin + 'else:' + name + end;
							name = name.split('.');
								
							buffer.push('stack.push(data)',
										'data=' + (name.length <= 1 ? 'evaluate(data, ' + quote(name) + ',true)' : 'nestedeval(data,[' + quote(name) + '],true)'),
										'filters=[' + quote(filters) + ']',
										'html+=conditional([' + quote(substring.split(elseif)) + '],options,test(' + quote(tag) + ',data),' + (tag == 'if' ? 'typeof data == "object"' : 'false') + ',data,stack[stack.length-1],filters)',
										'data=stack.pop()'
									);
							break;
							
						case 'loop':
						case 'repeat':
						
							if(tag == 'repeat') {
								
								name = name.split('.');
								buffer.push('stack.push(data);data=' + (name.length <= 1 ? 'evaluate(data, ' + quote(name) + ')' : 'nestedeval(data,[' + quote(name) + '])'));
							}
						
							if(filters.length > 0) buffer.push('filters=[' + quote(filters) + ']', 'for(tmp=0;tmp<filters.length;tmp++) data = options.filters[filters[tmp]](data)');
							
							buffer.push('if(typeof data == "object") html += iterate(' + quote(substring) + ',Object.keys(data), options, data)');
							if(tag == 'repeat') buffer.push('data=stack.pop()');
							break;
							
						default:
						
							buffer.push('tmp = options.parse != undef ? options.parse(' + quote(tag, name, substring) + ',data,options,filters) : ' + quote(substring),
										'if(options.parse == undef) log("unknown tag: ",' + quote(tag, name, substring, original) + ')',
										'html+= tmp == undef ? "" : tmp'
									);
							break;
					}
				}
			}
		}
		
		while(index != -1 && cIndex != -1);
		
		if(template !== '') buffer.push('html+=' + quote(template));
		
		return buffer.filter(function (string) { return string !== '' && string != '""' });
	}
			
	function conditional(templates, options, test, swap, data, context, filters) {
	
		var value = templates.length == 2 ? (test && swap ? data : context) : (!test ? undef : (swap ? data : context));
		
		if(filters && value != undef) for(var i = 0; i < filters.length; i++) value = options.filters[filters[i]](value);
		
		if(templates.length == 2) return compile(templates[!test ? 1 : 0], options)(value);
		
		if(!test) return '';
	
		return compile(templates[0], options)(value)
	}
	
	function iterate(template, keys, options, data) {
	
		var render = compile(template, options),key,html='';
		
		for(key = 0; key < keys.length; key++) html += render(evaluate(data,keys[key]))
			
		return html
	}
	
	function evaluate (object, property, raw) {
 
		var value;

		if(property == '.' || property === '') value = object;
		else value = typeof object[property] == 'function' ? object[property]() : object[property];
		
		return raw || value != undef ? value : ''
	}
	
	function nestedeval (object, paths, raw) {
	
		var value = object, key, i;
		
		for(i = 0; i < paths.length; i++) {
		
			key = paths[i];
			
			if(value[key] == undef) return raw ? undef : '';
			
			value = typeof value[key] == 'function' ? value[key]() : value[key]
		}
		
		return raw || value != undef ? value : '';
	}
		
	function test (tag, value) {

		switch(tag) {
		
			case 'if':
			case 'not-empty':
					return !!value;
					
			case 'defined':
					return value != undef;
			case 'empty':
					return !value;
					
			case 'loop':
			case 'repeat':
					return typeof value == 'object';
		}
		
		return true
	}
	
	function quote() { 
	
		return Array.flatten(arguments).map(function (string) { 
			return '"' + ('' + string).replace(/(["\\])/g, '\\$1').replace(/\n/g, '\\n') + '"' 
		})
	}
	
}(this, null);
