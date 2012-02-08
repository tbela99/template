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

	function has(object, property) { return Object.prototype.hasOwnProperty.call(object, property) }
	function log() { if(context.console && context.console.log) context.console.log.apply(context.console, arguments) }
				
	context.Template = new Class({

		options: {
		
			debug: true,
			//handle unknown tag
			parse: function (tag, name, substring, partial/* , filters, string, data, options */) {
			
				/* if(options.debug)  */log('unknown template tag: ' + tag, name, partial);
				
				return substring
			},
			begin: '{',
			end: '}'
		},		
		filters: {},
		modifiers: {},		
		initialize: function (options) { 
		
			Object.append(this.options, options) 
		},		
		addFilters: function (name, fn) {
		
			if(typeof name == 'object') Object.each(name, function (value, name) { this.filters[name] = value }, this);
			
			else this.filters[name] = fn;
			
			return this
		},		
		addModifier: function (name, fn) {
		
			if(typeof name == 'object') Object.each(name, function (value, name) { this.modifiers[name] = value }, this);
			
			else this.modifiers[name] = fn;
			
			return this
		},		
		html: function () { return Elements.from(this.substitute.apply(this, arguments)) },		
		substitute: function (string, data, options) {
		
			options = Object.append({}, this.options, options);
			
			var replace = {begin: options.begin.escapeRegExp(), end: options.end.escapeRegExp()},
				match = new RegExp('{begin}([a-z0-9][a-z0-9-_]*):([a-z0-9_\\.-]*)(\\s([a-z0-9-_\\.]+))*?{end}'.substitute(replace), 'i'),
				simplereg = new RegExp(('\\\\?{begin}([^' + (['[', ']'].indexOf(options.begin) != -1 ? replace.begin : replace.begin.replace(/\\/g, '')) + ']+){end}').substitute(replace), 'g');
			
			return this.parse(string, replace, match, simplereg, data, options)
		},		
		parse: function (string, replace, match, simplereg, data, options) {
		
			var matches;
				
			if(data != undef) {
				
				do {
					
					matches = match.exec(string);

					if(matches) {
						
						var open,
							close,
							index, //index of the first match
							index2,//index of the last match
							index3,//index of the {else: ...} match
							test,
							context, 
							elseif,
							html, 
							subject,
							partial,
							substring,
							values,
							i,
							tag = matches[1],
							name = matches[2],
							filters = matches[3] != undef ? matches[3] : '';
							
						open = options.begin + tag + ':' + name + filters + options.end;
						close = options.begin + '/' + tag + ':' + name + options.end;
						filters = filters == '' ? [] : filters.split(/\s+/g).filter(function (filter) { 
						
							var value = has(this.filters, filter);
							
							if(options.debug && filter != '' && !value) log('invalid template filter: ' + filter);
							
							return this.filters[filter]
						}, this);
						
						index2 = string.indexOf(close);
						
						if(index2 == -1) {
						
							if(options.debug && name.indexOf(':') != -1) log('suspicious template token found: "' + open + '", is the closing token missing ?', string);
							string = string.replace(open, '');
							continue;
						}
						
						index = string.indexOf(open);
						
						substring = string.substring(index + open.length, index2);
						partial = open + substring + close;
						
						switch(tag) {

							case 'if':
							case 'defined':
							case 'empty':
							case 'not-empty':

									//switch context for object or array
									subject = this.evaluate(data, name);
									
									//apply filters
									for(i = 0; i < filters.length; i++) subject = filters[i](subject)
									
									test = this.test(tag, subject);
									
									context = test && tag == 'if' && typeof subject == 'object';
									elseif = options.begin + 'else:' + name + options.end;
									
									//if-else or something like that
									index3 = string.indexOf(elseif);
									
									if(index3 != -1) {

										if(!test) string = string.replace(partial, this.parse(string.substring(index3 + elseif.length, index2), replace, match, simplereg, data, options));

										else if(context) string = string.replace(partial, this.parse(string.substring(index3 + elseif.length, index2), replace, match, simplereg, subject, options));
										else string = string.replace(partial, this.parse(string.substring(index + open.length, index3), replace, match, simplereg, data, options));
									}
									
									else {
									
										if(!test) string = string.replace(partial, '');

										else if(context) string = string.replace(partial, this.parse(substring, replace, match, simplereg, subject, options));
										else string = this.parse(string.replace(partial, this.parse(substring, data, options)), replace, match, simplereg, data, options);
									}
									
								break;
								
							case 'repeat':
							case 'loop':
								
								html = '';
								values = {};
								subject = tag == 'loop' ? (typeof data == 'function' ? data() : data) : this.evaluate(data, name);
								
								if(!this.test(tag, subject)) string = string.replace(partial, '');
								
								else {
									
									var value, property, single = new RegExp(options.begin.escapeRegExp() + '\.' + options.end.escapeRegExp(), 'g');
									
									//iterable - Array or Hash like
									if(typeof subject.each == 'function')  subject.each(function (value, key) {
									
										if(typeof value == 'function') value = value();
										
										if(value == undef) return;
										
										values[key] = value;
									}, this);
									
									else for(property in subject) if(has(subject, property)) {
									
										value = this.evaluate(subject, property);
										
										if(value == undef) continue;
										
										values[property] = value;
									}
									
									//apply filters
									for(i = 0; i < filters.length; i++) values = filters[i](values);
									
									Object.each(values, function (value) { html += typeof value != 'object' ? substring.replace(single, value) : this.parse(substring, replace, match, simplereg, value, options) }, this);
									string = string.replace(partial, html)
								}
								
								break;

							default: 
							
								var tmp = options.parse(tag, name, substring, partial, filters, string, data, options);
								
								string = string.replace(partial, tmp == undef ? '' : tmp);
								break;
						}
					}
				}
				
				while(matches)
			}
			
			return string.replace(simplereg, function(match, name) {
			
				if (match.charAt(0) == '\\') return match.slice(1);
				
				if(options.debug && name.indexOf(':') != -1) log('suspicious token found: "' + match + '", is the opening token missing ?', string);
				
				var value = this.evaluate(data, name);
				
				return value == undef ? '' : value
				
			}.bind(this))
		},	
		test: function (tag, value) {

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
		},		
		evaluate: function (object, property) {
		
			if(object == undef) return undef;
			
			if(this.modifiers[property] != undef) return this.modifiers[property](object, property);
			
			if(property.indexOf('.') != -1) {
			
				var value = typeof object == 'function' ? object() : object, paths = property.split('.'), key, i;
				
				for(i = 0; i < paths.length; i++) {
				
					key = paths[i];
					
					if(value[key] == undef) return undef;
					
					value = typeof value[key] == 'function' ? value[key]() : value[key]
				}
				
				return value
			}
			
			return typeof object[property] == 'function' ? object[property]() : object[property]
		}
	})

}(this);
