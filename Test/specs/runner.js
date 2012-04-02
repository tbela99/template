
describe("Template test", function() {
  
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
  
    it("Modifier ", function() {
      
		Number.prototype.toFileSize = function(units) {
		
			if(this == 0) return 0;
			
			var s = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'],
				e = Math.floor(Math.log(this) / Math.log(1024));

			return (this / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + (units && units[e] ? units[e] : s[e]);
		}
		
      expect(new Template().addModifier('toFileSize', function (data, property) {
	
			return (+data[property]).toFileSize()
			
		}).substitute('File: "{name}", size: {toFileSize size}', {name: 'Bob.jpg', size: 14578559})).
		toEqual('File: "Bob.jpg", size: 13.90 MB');
    });
	
    it("Filter <ul>{loop: reverse}<li>{name}</li>{/loop:}</ul>", function() {
      
      expect(new Template().addFilter('reverse', function (data) {
	
			var values = [];
			
			Object.each(data, function (value) { values.unshift(value) });
			
			return values
			
		}).substitute('<ul>{loop: reverse}<li>{name}</li>{/loop:}</ul>', [{name: 'Brian', sex: 'M'}, {name: 'Edith', sex: 'F'}, {name: 'Spider man', sex: 'M'}])).
			toEqual('<ul><li>Spider man</li><li>Edith</li><li>Brian</li></ul>')
	})
  });
	
	
  describe("Iterator", function() {
  
    it("Iterate with {loop} with context", function() {
      		
      expect(new Template().substitute('{loop:} {number}{/loop:}', [{number: 1}, {number: 2}, {number: 3}, {number: 4}])).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {loop} without context", function() {
      		
      expect(new Template().substitute('{loop:} {.}{/loop:}', [1, 2, 3, 4])).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {repeat} with context", function() {
      		
      expect(new Template().substitute('{repeat:items} {number}{/repeat:items}', {items: [{number: 1}, {number: 2}, {number: 3}, {number: 4}]})).
		toEqual(' 1 2 3 4');
    });
	
    it("Iterate with {repeat} without context", function() {
      		
      expect(new Template().substitute('{repeat:items} {.}{/repeat:items}', {items: [1, 2, 3, 4]})).
		toEqual(' 1 2 3 4');
    })
  });
	

  describe("Custom token delimiter", function() {
  
	
    it("Custom tags {{title}} spends {{calc}}", function() {
      
      expect(new Template().substitute('{{title}} spends {{calc}}', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  },
	  {
		begin: '{{',
		end: '}}'
	  })).toEqual("Joe spends 6");
    });
	
    it("Custom tags [[title]] spends [[calc]]", function() {
      
      expect(new Template().substitute('[[title]] spends [[calc]]', {
		  title: "Joe",
		  calc: function() {
			return 2 + 4;
		  }
	  },
	  {
		begin: '[[',
		end: ']]'
	  })).toEqual("Joe spends 6");
    })
  });
	
  });
  