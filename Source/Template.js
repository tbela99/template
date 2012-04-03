/*
---
script: template.js
license: MIT-style license.
description: Template - Context aware template engine with conditional replacement, iterations and filters.
copyright: Copyright (c) 2011 Thierry Bela
authors: [Thierry Bela]

requires: 
  core:1.3: 
  - Class
  - Elements.from
  
provides: [Template]
...
*/

!function (context, undef) {

"use strict";

	var log = (function () { return context.console && console.log ? function () { console.log.apply(console, arguments) } : function () { } })(),
		cache = {}, 
		slice = Array.slice,
		Object = context.Object,
		//vanilla js
		Template = context.Template = function () {},
		prop,
		options = {

				options: {
				
					debug: false,
					//handle unknown tag
					/**
						- tag
						- name
						- template,
						- data
						- options,
						- modifiers
						- global filters
						- local filters
					*/
					parse: function (/* tag, name, substring, data, options,modifiers,_filters, filters */) {
					
						var args = slice(arguments);
						log('unknown template tag: ', args);
						
						return args[2]
					},
					begin: '{',
					end: '}'
				},		
				filters: {},
				modifiers: {},		
				initialize: function (options) { 
				
					Object.append(this.options, options);
				},		
				addFilter: function (name, fn) {
				
					if(typeof name == 'object') Object.each(name, function (value, name) { this.filters[name] = value }, this);
					
					else this.filters[name] = fn;
					
					return this
				},		
				addModifier: function (name, fn) {
				
					if(typeof name == 'object') Object.each(name, function (value, name) { 
						
						this.modifiers[name] = function () {
					
							var value = fn.apply(null, arguments);
							
							return value == undef ? '' : value
						}
						
					}, this);
					
					else this.modifiers[name] = function () {
					
						var value = fn.apply(null, arguments);
						
						return value == undef ? '' : value
					};
					
					return this
				},		
				html: function () { return Elements.from(this.substitute.apply(this, arguments)) },		
				substitute: function (template, data, options) {
				
					options = Object.append({}, this.options, options);
					
					return compile(template, this.modifiers, this.filters, options)(this.modifiers, this.filters, data, options)
				}	
			};

	Template.prototype = function (options) {

		if(options.initialize) options.initialize.apply(this, options)
	};

	for(prop in options) if(has(options, prop)) Template.prototype[prop] = options[prop]

	function has(object, property) { return Object.prototype.hasOwnProperty.call(object, property) }
	
	//the idea is to return template token + self evaluated js
	function compile(template, modifiers, _filters, options) {
	
		if(options.cache !== false && cache[template]) return cache[template];
		
		cache[template] = parse(template, modifiers, _filters, options);
		
		return cache[template]
	}
	
	//
	function parse (template, modifiers, _filters, options) {
	
		var code = '""', 
			glue = options.debug ? '+\n' : '+',
			index,
			cIndex,
			length = options.begin.length ,
			cTagIndex,
			string = '',
			match,
			oTag,
			cTag,
			tag,
			name,
			filters,
			substring,
			original = template;
		
		do {
		
			filters = '';
			index = template.indexOf(options.begin);
			cIndex = template.indexOf(options.end, index);
			
			if(index != -1 && cIndex != -1) {
			
				if(template.charAt(index - 1) == '\\') {
				
					string = template.substring(0, cIndex + length);
					
					code += glue + quote(template.substring(0, index - 1) + template.substring(index, cIndex + length));
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
					
					code += glue + quote(string) + glue + (modifiers[name] ? 'modifiers[' + match + '](data' + (filters && filters.length > 0 ? ',' + filters.map(function (v) { return quote(v) }) : '') + ')' : name.indexOf('.') == -1 ? 'evaluate(data,' + match + ')' : 'nestedeval(data,[' + name.split('.').map(function (v) { return quote(v) }) + '])');
					
					template = template.replace(string + oTag, '')
				}
				
				else {
				
					code += glue + quote(string);
					
					filters = match.split(':');
					tag = filters.shift();
					if(filters[0].charAt(0) == ' ') name = '';
					else {
					
						filters = filters.join(' ').split(' ');
						name = filters.shift();
					}
					
					if(filters.length > 0) filters = filters.join(' ').split(' ').filter(function (filter) { return _filters[filter] }).map(function (filter) { return _filters[filter] })
					
					match = quote(name);
					
					cTag = options.begin + '/' + tag + ':' + name + options.end;
					
					cTagIndex = template.indexOf(cTag);
					
					if(cTagIndex == -1) {
					
						log('token ' + oTag  + ' is not closed properly: "' + template.substring(0, cIndex + 1) + '"\n' + original);
						template = template.replace(oTag, '');
						continue;
					}
					
					substring = template.substring(index + oTag.length, cTagIndex);
					template = template.replace(template.substring(0, cTagIndex + cTag.length), '');
					
					switch(tag) {
					
						case 'if':
						case 'defined':
						case 'empty':
						case 'not-empty':

							code += glue + 'conditional([' + substring.split(options.begin + 'else:' + name + options.end).map(function (v) { return quote(v) }) + '],' + quote(tag, name) + ',data,options,modifiers,_filters' + (filters && filters.length > 0 ? ',[' + filters + ']' : '') + ')';
							break;
							
						case 'loop':
						case 'repeat':
						
							code += glue + 'iterate(' + quote(substring, tag, name) + ',data,options,modifiers,_filters' + (filters && filters.length > 0 ? ',[' + filters + ']' : '') + ')';
							break;
							
						default:
						
							code += glue + 'custom(' + quote(tag, name, substring) + ', modifiers, _filters, data, options,modifiers,_filters' + (filters && filters.length > 0 ? ',[' + filters + ']' : '') + ')';
							break;
					}
				}
			}
		}
		
		while(index != -1 && cIndex != -1);
		
		code = (code + glue + quote(template)).replace(/^""\+\n?|"\+\n?"|\+\n?""/mg, '');
        
		if(options.debug) log(code);
		
		var fn = new Function ('modifiers', '_filters', 'data', 'options', 'compile', 'evaluate', 'nestedeval', 'conditional', 'iterate', 'custom', 'undef', 'return ' + code);
		
		return function (modifiers, _filters, data, options) {
		
			return fn(modifiers, _filters, data, options, compile, evaluate, nestedeval, conditional, iterate, custom)
		}
	}
	
	function custom() {
	
		var args = slice(arguments),
			tmp = args[6].parse.apply(undef, args);
		
		return tmp == undef ? '' : tmp;
	}
	
	function evaluate (object, property) {

		var value = typeof object[property] == 'function' ? object[property]() : object[property];
		
		return value == undef ? '' : value
	}
	
	function nestedeval (object, paths) {
	
		var value = typeof object == 'function' ? object() : object, key, i;
			
		for(i = 0; i < paths.length; i++) {
		
			key = paths[i];
			
			if(value[key] == undef) return '';
			
			value = typeof value[key] == 'function' ? value[key]() : value[key]
		}
		
		return value == undef ? '' : value;
	}
				
	function conditional(templates, tag, name, data, options, modifiers, _filters, filters) {
	
		var subject = evaluate(data, name), t, i, context, tpl0 = templates[0], tpl1 = templates[1];
	
		if(filters) for(i = 0; i < filters.length; i++) subject = filters[i](subject);

		t = test(tag, subject);
		
		context = t && tag == 'if' && typeof subject == 'object';
		
		//elseif
		if(tpl1 != undef) {

			//
			if(!t) return tpl1;
			
			else if(context) return compile(tpl1, modifiers, _filters, options)(modifiers, _filters, subject, options);
			
			else return compile(tpl0, modifiers, _filters, options)(modifiers, _filters, subject, options)
		}
	
		if(!t) return '';

		else if(context) return compile(tpl0, modifiers, _filters, options)(modifiers, _filters, subject, options);
		
		return compile(tpl0, modifiers, _filters, options)(modifiers, _filters, data, options)
	}
	
	function iterate(template, tag, name, data, options, modifiers, _filters, filters) {
	
		var html = '', i, values = {},
			value, 
			property,
			single,
			clean,
			subject = tag == 'loop' ? (typeof data == 'function' ? data() : data) : evaluate(data, name);
		
		if(!test(tag, subject)) return '';
		
		//iterable - Array or Hash like
		if(typeof subject.each == 'function')  subject.each(function (value, key) {
		
			if(typeof value == 'function') value = value();
			
			if(value == undef) return;
			
			values[key] = value;
		}, this);
		
		else for(property in subject) if(has(subject, property)) {
		
			value = evaluate(subject, property);
			
			if(value == undef) continue;
			
			values[property] = value;
		}
		
		//apply filters
		if(filters) for(i = 0; i < filters.length; i++) values = filters[i](values);
		
		single = new RegExp(options.begin.escapeRegExp() + '.*?' + options.end.escapeRegExp(), 'g');
		for(property in values) {
		
			if(!has(values, property)) continue;
			
			value = values[property];
			
			html += 
					typeof value != 'object' ? template.replace(single, value).replace(clean, '')
					: 
					compile(template, modifiers, _filters, options)(modifiers, _filters, value, options);
		}
		
		return html
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
					return value != undef && ['object', 'function'].indexOf(typeof value)  != -1;
		}
		
		return true
	}
	
	function quote() { 
	
		return Array.flatten(arguments).map(function (string) { 
			return '"' + ('' + string).replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"' 
		})
	}
	
}(this, null);
