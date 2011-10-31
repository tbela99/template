/*
---
script: template.js
license: MIT-style license.
description: Template - Context aware template engine with conditional replacement & iteration.
copyright: Copyright (c) 2011 Thierry Bela
authors: [Thierry Bela]

requires: 
  core:1.3: 
  - Class
  - Elements.from
  
provides: [Template]
...
*/

!function (context, undefined) {

"use strict";

	function log() { if(context.console && context.console.log) context.console.log.apply(context.console, arguments) }
				
	context.Template = new Class({

		options: {
		
			debug: true,
			multiline: false,
			placeholder: '\u21b5',
			//handle unknown tag
			parse: function (tag, matches /*, name, data, string, regExp, replace, simplereg, options */) {
			
				if(options.debug) log('unknown tag: ' + tag, matches);
				
				return matches[3]
			},
			begin: '{',
			end: '}'
		},
		
		regExp: '{begin}([a-z0-9][a-z0-9-_]*):([a-z0-9_.-]*){end}(.*?){begin}\\/\\1:\\2{end}',
		
		initialize: function (options) { 
		
			this.options = Object.append(this.options, options) 
		},
		
		substitute: function (string, data, options) {
		
			options = Object.append({}, this.options, options);
			
			var replace ={begin: options.begin.escapeRegExp(), end: options.end.escapeRegExp()},
				regExp = new RegExp(this.regExp.substitute(replace), 'i'),
				simplereg = new RegExp(('\\\\?{begin}([^' + (['[', ']'].indexOf(options.begin) != -1 ? replace.begin : replace.begin.replace(/\\/g, '')) + ']+){end}').substitute(replace), 'g');
			
			if(options.multiline) return this.parse(string.replace(/\n/g, options.placeholder), data, regExp, replace, simplereg, options).replace(new RegExp(options.placeholder.escapeRegExp(), 'g'), '\n');
			
			return this.parse(string, data, regExp, replace, simplereg, options)
		},
		
		html: function () { return Elements.from(this.substitute.apply(this, arguments)) },
		
		parse: function (string, data, regExp, replace, simplereg, options) {
		
			if(data != undefined) {
				
				var matches = regExp.exec(string);

				if(matches) {

					var tag = matches[1], test, name = matches[2], context, el, html = '', subject;

					switch(tag) {


						case 'if':
						case 'defined':
						case 'empty':
						case 'not-empty':

								//switch context for object or array
								subject = this.evaluate(data, name);
								
								test = this.test(tag, subject);
								
								context = test && tag == 'if' && typeof subject == 'object';
								
								//if-else or something like that
								el = new RegExp('(.*?)' + replace.begin + 'else:' + name.escapeRegExp() + replace.end + '(.*)', 'i').exec(matches[3]);

								if(el) {

									if(!test) return this.parse(string.replace(matches[0], el[2]), data, regExp, replace, simplereg, options);

									if(context) return this.parse(string.replace(matches[0], this.parse(el[1], subject, regExp, replace, simplereg, options)), data, regExp, replace, simplereg, options);
									return this.parse(string.replace(matches[0], el[1]), data, regExp, replace, simplereg, options);
								}

								if(!test) return this.parse(string.replace(matches[0], ''), data, regExp, replace, simplereg, options);

								if(context) return this.parse(string.replace(matches[0], this.parse(matches[3], subject, regExp, replace, simplereg, options)), data, regExp, replace, simplereg, options);
								
								return this.parse(string.replace(matches[0], matches[3]), data, regExp, replace, simplereg, options);

						case 'repeat':
						case 'loop':
							
							subject = tag == 'loop' ? (typeof data == 'function' ? data() : data) : this.evaluate(data, name);
							
							if(!this.test(tag, subject)) return this.parse(string.replace(matches[0], ''), data, regExp, replace, simplereg, options);

							var value, property, single = new RegExp(replace.begin + '\.' + replace.end, 'g');
							
							//iterable - Array or Hash like
							if(typeof subject.each == 'function')  subject.each(function (value) {
							
								if(typeof value == 'function') value = value();
								
								if(value == undefined) return;
								
								html += typeof value != 'object' ? matches[3].replace(single, value) : this.parse(matches[3], value, regExp, replace,  simplereg, options)
							}, this);
							
							else for(property in subject) if(subject.hasOwnProperty(property)) {
							
								value = this.evaluate(subject, property);
								
								if(value == undefined) continue;
								
								//hopefully matches[3] should be a simple token. replace {.} by the property value
								html += typeof value != 'object' ? matches[3].replace(single, value) : this.parse(matches[3], value, regExp, replace,  simplereg, options)
							}
							
							return this.parse(string.replace(matches[0], html), data, regExp, replace, simplereg, options);
							
						default: 

							//custom tag parsing
							if(options.parse) return this.parse(string.replace(matches[0], options.onParse(tag, matches, name, data, string, regExp, replace, simplereg, options) || ''), data, regExp, replace, simplereg, options);
					}
				}
			}
			
			return string.replace(simplereg, function(match, name) {
			
				if (match.charAt(0) == '\\') return match.slice(1);
				
				if(options.debug && name.indexOf(':') != -1) log('suspicious token found: "' + match + '", is the ' + (match.charAt(1) == '/' ? 'opening' : 'closing') + ' token missing ?', string);
				
				var value = this.evaluate(data, name, true);
				
				return value == undefined ? '' : value
				
			}.bind(this))
		},
		
		test: function (tag, value) {

			switch(tag) {
			
				case 'if':
				case 'not-empty':
						return !!value;
						
				case 'defined':
						return value != undefined;
				case 'empty':
						return !value;
						
				case 'loop':
				case 'repeat':
						return value != undefined && ['object', 'function'].indexOf(typeof value)  != -1;
			}
			
			return true
		},
		
		evaluate: function (object, property, ispath) {
		
			if(object == undefined) return undefined;
			
			if(ispath && property.indexOf('.') != -1) {
			
				var value = typeof object == 'function' ? object() : object, paths = property.split('.'), key;
				
				while(value && paths.length > 0) {
				
					key = paths.shift();
					
					if(typeof data[key] == undefined) return undefined;
					
					value = typeof value[key] == 'function' ? value[key]() : value[key]
				}
				
				return value
			}
			
			return typeof object[property] == 'function' ? object[property].call(object) : object[property]
		}
	})

}(this);
