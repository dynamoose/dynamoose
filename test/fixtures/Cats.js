'use strict';

module.exports = function(dynamoose){
  var ONE_YEAR = 365*24*60*60; // 1 years in seconds
  var NINE_YEARS = 9*ONE_YEAR; // 9 years in seconds
  
  var Cat = dynamoose.model('Cat',
  {
    id: {
      type:  Number,
      validate: function (v) { return v > 0; }
    },
    name: String,
    owner: String,
    age: { type: Number },
    vet:{
      name: String,
      address: String
    },
    ears:[{
      name: String
    }],
    legs: [String],
    more: Object,
    array: Array,
    validated: {
      type: String,
      validate: function (v) { return v === 'valid'; }
    }
  },
  {useDocumentTypes: true});

  // Create a model with unnamed attributes
  var Cat1 = dynamoose.model('Cat1',
    {
      id: {
        type:  Number,
        validate: function (v) { return v > 0; },
        default: 888
      },
      name: {
        type: String,
        required: true,
        default: 'Mittens'
      },
      owner: String
      // children: {
      //   type: Object
      // }
    },
    {
      useDocumentTypes: true,
      saveUnknown: true
    });

  // Create a model with a range key
  var Cat2 = dynamoose.model('Cat2',
  {
    ownerId: {
      type: Number,
      hashKey: true
    },
    name: {
      type: String,
      rangeKey: true
    }
  });

  // Create a model with required attributes
  var Cat3 = dynamoose.model('Cat3',
  {
    id: {
      type:  Number,
      validate: function (v) { return v > 0; },
      default: 888
    },
    name: {
      type: String,
      required: true,
      default: 'Mittens'
    },
    owner: String,
    age: {
      type: Number,
      required: true
    }
  });

  // Create a model with timestamps
  var Cat4 = dynamoose.model('Cat4',
  {
    id: {
      type:  Number,
      validate: function (v) { return v > 0; }
    },
    name: {
      type: String,
      default: 'Bobo'
    }
  },
  {
    timestamps: {
      createdAt: 'myLittleCreatedAt',
      updatedAt: 'myLittleUpdatedAt'
    }
  });

  // Create a model with unnamed attributes
  var Cat5 = dynamoose.model('Cat5',
    {
      id: {
        type:  Number,
        validate: function (v) { return v > 0; },
        default: 888
      },
      name: {
        type: String,
        required: true,
        default: 'Mittens'
      },
      owner: String,
    },
    {
      saveUnknown: true
    });

  var Cat6 = dynamoose.model('Cat6',
    {
      id: {
        type:  Number
      },
      name: {
        type: String
      },
      parent: {
        type: Number,
        ref: 'Cat6'
      }
    }
  );

  var Cat7 = dynamoose.model('Cat7',
    {
      id: {
        type:  Number,
        hashKey: true
      },
      name: {
        type: String
      },
      parent: Number,
      isHappy: Boolean
    }
  );

  var Cat8 = dynamoose.model('Cat8',
    {
      id: {
        type:  Number,
        hashKey: true
      },
      age: {
        type: Number,
        rangeKey: true
      }
    }
  );

  var CatWithOwner = dynamoose.model('CatWithOwner',
    {
      id: {
        type:  Number
      },
      name: {
        type: String
      },
      owner: {
        name: String,
        address: String
      }
    }
  );

  var Owner = dynamoose.model('Owner',
    {
      name: {
        type: String,
        hashKey: true
      },
      address: {
        type: String,
        rangeKey: true
      },
      phoneNumber: String
    }
  );

  var ExpiringCat = dynamoose.model('ExpiringCat',
    {
      name: String
    },
    {
      expires: NINE_YEARS
    }
  );

  var CatWithGeneratedID = dynamoose.model('CatWithGeneratedID',
    {
      id: {
        type: String,
        default: function (model) {
          return model.owner.name + '_' + model.name;
        },
        validate: function (value, model) {
          return value === model.owner.name + '_' + model.name;
        }
      },
      name: {
        type: String,
      },
      owner: {
        name: String,
        address: String
      }
    }
  );

  var CatModel = dynamoose.model('CatDefault',
  {
      id: {
          type:  Number,
          validate: function (v) { return v > 0; }
      },
      name: String,
      owner: String,
      shouldRemainUnchanged: {
          type: String,
          default: function(model) {
              return 'shouldRemainUnchanged_'+ model.name +'_'+ model.owner;
          }
      },
      shouldBeChanged: {
          type: String,
          default: function(model) {
              return 'shouldBeChanged_'+ model.name +'_'+ model.owner;
          }
      },
      shouldAlwaysBeChanged: {
          type: String,
          default: function(model) {
              return 'shouldAlwaysBeChanged_'+ model.name +'_'+ model.owner;
          },
          forceDefault: true
      },
      unsetShouldBeChanged: {
          type: String,
          default: function(model) {
              return 'unsetShouldBeChanged_'+ model.name +'_'+ model.owner;
          }
      },
      unsetShouldAlwaysBeChanged: {
          type: String,
          default: function(model) {
              return 'unsetShouldAlwaysBeChanged_'+ model.name +'_'+ model.owner;
          }
      }
  }
);

  return {
    Cat: Cat,
    Cat1: Cat1,
    Cat2: Cat2,
    Cat3: Cat3,
    Cat4: Cat4,
    Cat5: Cat5,
    Cat6: Cat6,
    Cat7: Cat7,
    Cat8: Cat8,
    CatWithOwner: CatWithOwner,
    Owner: Owner,
    ExpiringCat: ExpiringCat,
    CatWithGeneratedID: CatWithGeneratedID,
    CatModel: CatModel
  };
};