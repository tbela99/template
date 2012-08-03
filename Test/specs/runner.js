
describe("Template test", function() {
  
"use strict";

  describe("Default features", function() {
  
    it("Simple token replacement {title} spends {calc}", function() {
      
      expect(new Template().substitute('{title} spends {calc}', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  })).toEqual("Joe spends 6");
    });
	
    it("Dot notation {title} spends {calc} on {products.0}'", function() {
      
      expect(new Template().substitute('{title} spends {calc} on {products.0}', {
	  
			title: "Joe",
			calc: function() {
				return 2 + 4;
			},
			products: ['tomatoes']
	  })).toEqual("Joe spends 6 on tomatoes");
    });
	
    it("Escaped token", function() {
      
      expect(new Template().substitute('\\{ignore me} {title} spends {calc} on {products.0}', {
	  
			title: "Joe",
			calc: function() {
				return 2 + 4;
			},
			products: ['tomatoes']
	  })).toEqual("{ignore me} Joe spends 6 on tomatoes");
    })
  });
	
  describe("Filters and modifiers", function() {

	it("Modifier the sum is {sum} and the product is {product}", function() {
		
		expect(new Template().addModifier('sum', function (data) {
	
				var sum = 0, i;
						
				for(i = 0; i < data.length; i++) if(!isNaN(data[i])) sum += data[i];
				
				return sum
			}).
			addModifier('product', function (data) {
			
				var product = 1, //this should be one but I want to test falsy values get printed correctly
					i;
				
				for(i = 0; i < data.length; i++) if(!isNaN(data[i])) product *= data[i];
				
				return product
			}).substitute('the sum is {sum} and the product is {product}', [1, 2, 3, 4, 0])).
		toEqual('the sum is 10 and the product is 0');
	});
  
	Number.prototype.toFileSize = function(units) {
	
		if(this == 0) return 0;
		
		var s = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'],
			e = Math.floor(Math.log(this) / Math.log(1024));

		return (this / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + (units && units[e] ? units[e] : s[e]);
	}
	
	it('Modifier File: "{name}", size: {toFileSize size}', function() {
				
		expect(new Template().addModifier('toFileSize', function (data, property) {

			return (+data[property]).toFileSize()

		}).substitute('File: "{name}", size: {toFileSize size}', {name: 'Bob.jpg', size: 14578559})).
		toEqual('File: "Bob.jpg", size: 13.90 MB');
	})

	
    it("Filter <ul>{loop: reverse}<li>{name}</li>{/loop:}</ul>", function() {
      
      expect(new Template().addFilter('reverse', function (data) {
	
			var values = [];
			
			Object.each(data, function (value) { values.unshift(value) });
			
			return values
			
		}).substitute('<ul>{loop: reverse}<li>{name}</li>{/loop:}</ul>', [{name: 'Brian', sex: 'M'}, {name: 'Edith', sex: 'F'}, {name: 'Spider man', sex: 'M'}])).
			toEqual('<ul><li>Spider man</li><li>Edith</li><li>Brian</li></ul>')
	});
	
    it("Filter Hi, my name is {name}.{if:kids girls} I have {length} girl.{/if:kids}.{if:kids boys} I have {length} boys.{/if:kids}<br/>", function() {
      
      expect(new Template().addFilter({girls: function (data) {
	
			var values = [];
			
			Object.each(data, function (value) { if(value.sex == 'F') values.push(value) });
			
			return values
			
		},
		boys: function (data) {
		
			var values = [];
			
			Object.each(data, function (value) { if(value.sex == 'M') values.push(value) });
			
			return values
			
		}
	}).substitute(' Hi, my name is {name}.{if:kids girls} I have {length} girl{/if:kids}.{if:kids boys} I have {length} boys.{/if:kids}<br/>', 
		{name: 'Emily', kids: [{name: 'Brian', sex: 'M'}, {name: 'Edith', sex: 'F'}, {name: 'Spider man', sex: 'M'}]})).
		toEqual(' Hi, my name is Emily. I have 1 girl. I have 2 boys.<br/>')
	});
  });
	
	
  describe("Conditional replacement", function() {
  
	describe("{if}", function() {
		
		it("Conditional {if} with no context", function() {
				
		  expect(new Template().substitute('{if:0} {0}{/if:0}', [1, 2, 3, 4])).
			toEqual(' 1');
		});
		
		it("Conditional {if} with context {if:0} {number}{/if:0}", function() {
				
		  expect(new Template().substitute('{if:0} {number}{/if:0}', [{number: 1}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' 1');
		});
		
		it("Conditional {if} with nested context {if:0.user} {name}{/if:0.user}", function() {
				
		  expect(new Template().substitute('{if:0.user} {name}{/if:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
		
		it("Conditional {if-else} with no context", function() {
				
		  expect(new Template().substitute('{if:10} {0}{else:10} {0}{/if:10}', [1, 2, 3, 4])).
			toEqual(' 1');
		});
		
		it("Conditional {if-else} with context {if:10}10{else:10} {0.number}{/if:10}", function() {
				
		  expect(new Template().substitute('{if:0} {number}{/if:0}', [{number: 1}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' 1');
		});
		
		it("Conditional {if-else} with nested context {if:1.user}{name} {else:1.user} {0.user.name}{/if:1.user}", function() {
				
		  expect(new Template().substitute('{if:0.user} {name}{/if:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
	});
	
	describe("{defined}", function() {
		
		it("Conditional {defined} with nested context {defined:0.user} {0.user.name}{/defined:0.user}", function() {
				
		  expect(new Template().substitute('{defined:0.user} {0.user.name}{/defined:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
		
		it("Conditional {defined} with nested context is false", function() {
				
		  expect(new Template().substitute('{defined:1.user} {0.user.name}{/defined:1.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual('');
		})
	});
	
	describe("{empty}", function() {
		
		it("Conditional {empty} with nested context is true", function() {
				
		  expect(new Template().substitute('{empty:1.user} {0.user.name}{/empty:1.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
		
		it("Conditional {empty} with nested context is false", function() {
				
		  expect(new Template().substitute('{empty:0.user} {0.user.name}{/empty:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual('');
		});
		
		it("Conditional {empty-else} with nested context is false", function() {
				
		  expect(new Template().substitute('{empty:0.user}empty!{else:0.user} {0.user.name}{/empty:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
		
		it("Conditional {empty-else} with nested context is true", function() {
				
		  expect(new Template().substitute('{empty:0.user} {0.user.name}{else:0.user} {0.user.name}{/empty:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
	});
	
	describe("{not-empty}", function() {
			
		it("Conditional {not-empty} with nested context is true", function() {
				
		  expect(new Template().substitute('{not-empty:0.user} {0.user.name}{/not-empty:0.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
		
		it("Conditional {not-empty} with nested context is false", function() {
				
		  expect(new Template().substitute('{not-empty:1.user} {0.user.name}{/not-empty:1.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual('');
		});
		
		it("Conditional {not-empty-else} with nested context is false", function() {
				
		  expect(new Template().substitute('{not-empty:1.user}not empty!{else:1.user} {0.user.name}{/not-empty:1.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' sammy');
		});
		
		it("Conditional {not-empty-else} with nested context is true", function() {
				
		  expect(new Template().substitute('{not-empty:1.user} {0.user.name}{else:1.user} {1.number}{/not-empty:1.user}', [{number: 1, user: {name: 'sammy'}}, {number: 2}, {number: 3}, {number: 4}])).
			toEqual(' 2');
		});
	});
  });
	
	
  describe("Iterator", function() {
  
    it("Iterate with {loop} with context (array)", function() {
      		
      expect(new Template().substitute('{loop:} {number}{/loop:}', [{number: 1}, {number: 2}, {number: 3}, {number: 4}])).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {loop} with context (array) #2", function() {
      		
      expect(new Template().substitute('{loop:} {number}\\{name}{/loop:}', [{number: 1}, {number: 2}, {number: 3}, {number: 4}])).
		toEqual(' 1{name} 2{name} 3{name} 4{name}');
    });
	
    it("Iterate with {loop} with context (object)", function() {
      		
      expect(new Template().substitute('{loop:} {.}{/loop:}', {first: 'Jane', last: 'Doe'})).
		toEqual(' Jane Doe');
    });
	
    it("Iterate with {loop} without context", function() {
      		
      expect(new Template().substitute('{loop:} {.}{/loop:}', [1, 2, 3, 4])).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {loop} without context #2", function() {
      		
      expect(new Template().substitute('{loop:} {name}{.}{/loop:}', [1, 2, 3, 4])).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {loop} without context #3", function() {
      		
      expect(new Template().substitute('{loop:} \\{name}{.}{/loop:}', [1, 2, 3, 4])).
		toEqual(' {name}1 {name}2 {name}3 {name}4');
    });
	
    it("Iterate with {repeat} with context (array)", function() {
      		
      expect(new Template().substitute('{repeat:items} {number}{/repeat:items}', {items: [{number: 1}, {number: 2}, {number: 3}, {number: 4}]})).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {repeat} with context (object)", function() {
      		
      expect(new Template().substitute('{repeat:items} {.}{/repeat:items}', {items: {first: 'Jane', 'last': 'Doe'}})).
		toEqual(' Jane Doe');
    });
	
    it("Iterate with {repeat} with nested context", function() {
      		
      expect(new Template().substitute('{repeat:items.0.series} {.}{/repeat:items.0.series}', {items: [{number: 1, series: [0, 2, 3, 4]}, {number: 2}, {number: 3}, {number: 4}]})).
		toEqual(' 0 2 3 4');
    });
	
    it("Iterate with {repeat} without context", function() {
      		
      expect(new Template().substitute('{repeat:items} {.}{/repeat:items}', {items: [1, 2, 3, 4]})).
		toEqual(' 1 2 3 4');
    });
    it("Iterate with {repeat} without context #2", function() {
      		
      expect(new Template().substitute('{repeat:items} {.}{name}{/repeat:items}', {items: [1, 2, 3, 4]})).
		toEqual(' 1 2 3 4');
    })
  });
	
  describe("Custom token delimiter", function() {
  
    it("Custom tags {{title}} spends {{calc}}", function() {
      
      expect(new Template({
		begin: '{{',
		end: '}}'
	  }).substitute('{{title}} spends {{calc}}', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  })).toEqual("Joe spends 6");
    });
	
    it("Custom tags [[title]] spends [[calc]]", function() {
      
      expect(new Template({
		begin: '[[',
		end: ']]'
	  }).substitute('[[title]] spends [[calc]]', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  }
	  )).toEqual("Joe spends 6");
    })
  });
	
  describe("Unknown token", function() {
  
    it("using default parse {lambda:nil}some text{/lambda:nil}", function() {
      
      expect(new Template().substitute('{lambda:nil}some text{/lambda:nil}', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  })).toEqual("some text");
    });
	
    it("using custom parse {lambda:nil}some text{/lambda:nil}", function() {
      
      expect(new Template({
	  
		parse: function () { return 'Yes!' }
	  }).substitute('{lambda:nil}some text{/lambda:nil}', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  }
	  )).toEqual("Yes!")
    })
  });
	
  describe("Escaping string", function() {
  
  describe("raw modifier", function() {
  
    it("escape string by default, use raw modifier to not escape string {exp1} {op} {exp2} {raw link}", function() {
      
      expect(new Template({escape: true}).substitute('{exp1} {op} {exp2} {raw link}', {
	  
		  exp1: '2 > 1',
		  op: '&&',
		  exp2: '2 < 5',
		  link: '<a href="#foo">Reference</a>'
	  })).toEqual("2 &gt; 1 &amp;&amp; 2 &lt; 5 <a href=\"#foo\">Reference</a>")
    });
	
    it("escape string by default, use raw modifier to not escape string {raw exp1} {raw op} {raw exp2}", function() {
      
      expect(new Template({escape: true}).substitute('{raw exp1} {raw op} {raw exp2}', {
	  
		  exp1: '2 > 1',
		  op: '&&',
		  exp2: '2 < 5',
	  })).toEqual("2 > 1 && 2 < 5")
    });
	
    it("Using dot notation: escape string by default, use raw modifier to not escape string {raw math.exp1} {raw math.op} {raw math.exp2}", function() {
      
      expect(new Template({escape: true}).substitute('{raw math.exp1} {raw math.op} {raw math.exp2}', {

		math: {
		
			exp1: '"2 > 1"',
			op: '&&',
			exp2: "'2 < 5'"
		}
	  })).toEqual("\"2 > 1\" && '2 < 5'")
    })	
  });
  
  describe("escape modifier", function() {
  
    it("escape special chars using escape modifier {escape exp1} {escape op} {escape exp2}", function() {
      
      expect(new Template().substitute('{escape exp1} {escape op} {escape exp2}', {
	  
		  exp1: '2 > 1',
		  op: '&&',
		  exp2: '2 < 5'
	  })).toEqual("2 &gt; 1 &amp;&amp; 2 &lt; 5")
    });
	
    it("escape special chars, single and double quotes using escape modifier {escape exp1 true} {escape op true} {escape exp2 true}", function() {
      
      expect(new Template().substitute('{escape exp1 true} {escape op true} {escape exp2 true}', {
	  
		  exp1: '"2 > 1"',
		  op: '&&',
		  exp2: "'2 < 5'"
	  })).toEqual("&quot;2 &gt; 1&quot; &amp;&amp; &apos;2 &lt; 5&apos;")
    });
	
    it("using dot notation: escape special chars using escape modifier {escape math.exp1} {escape math.op} {escape math.exp2}", function() {
      
      expect(new Template().substitute('{escape math.exp1} {escape math.op} {escape math.exp2}', {
		
		math: {
	  
			exp1: '2 > 1',
			op: '&&',
			exp2: '2 < 5'
		}
	  })).toEqual("2 &gt; 1 &amp;&amp; 2 &lt; 5")
    });
	
    it("using dot notation: escape special chars, single and double quotes with escape modifier {escape math.exp1 true} and {escape math.exp2 true}", function() {
      
      expect(new Template().substitute('{escape math.exp1} {escape math.op true} {escape math.exp2}', {

		math: {
		
			exp1: '"2 > 1"',
			op: '&&',
			exp2: "'2 < 5'"
		}
	  })).toEqual("&quot;2 &gt; 1&quot; &amp;&amp; &apos;2 &lt; 5&apos;")
    })
  });
  
  describe("Escaping string by default", function() {
  
    it("escape special chars by default {exp1} {op} {exp2}", function() {
      
      expect(new Template({
	  
		escape: true
	  }).substitute('{exp1} {op} {exp2}', {
	  
		  exp1: '2 > 1',
		  op: '&&',
		  exp2: '2 < 5'
	  })).toEqual("2 &gt; 1 &amp;&amp; 2 &lt; 5")
    });
	
    it("escape special chars, single and double quotes by default {exp1} {op} {exp2}", function() {
      
      expect(new Template({
	  
		escape: true
	  }).substitute('{exp1} {op} {exp2}', {
	  
		  exp1: '"2 > 1"',
		  op: '&&',
		  exp2: "'2 < 5'"
	  })).toEqual("&quot;2 &gt; 1&quot; &amp;&amp; &apos;2 &lt; 5&apos;")
    });
	
    it("using dot notation: escape special chars by default {math.exp1} {math.op} {math.exp2}", function() {
      
      expect(new Template({
	  
		escape: true
	  }).substitute('{math.exp1} {math.op} {math.exp2}', {
		
		math: {
	  
			exp1: '2 > 1',
			op: '&&',
			exp2: '2 < 5'
		}
	  })).toEqual("2 &gt; 1 &amp;&amp; 2 &lt; 5")
    });
	
    it("using dot notation: escape special chars, single and double quotes by default {math.exp1} and {math.exp2}", function() {
      
      expect(new Template({
	  
		escape: true
	  }).substitute('{math.exp1} {math.op} {math.exp2}', {

		math: {
		
			exp1: '"2 > 1"',
			op: '&&',
			exp2: "'2 < 5'"
		}
	  })).toEqual("&quot;2 &gt; 1&quot; &amp;&amp; &apos;2 &lt; 5&apos;")
    })
  })
  
  })
});
  