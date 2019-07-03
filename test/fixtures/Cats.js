'use strict';

module.exports = function (dynamoose) {
  const ONE_YEAR = 365 * 24 * 60 * 60; // 1 years in seconds
  const NINE_YEARS = 9 * ONE_YEAR; // 9 years in seconds

  const Cat = dynamoose.model('Cat', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; }
    },
    'name': String,
    'owner': String,
    'age': {'type': Number},
    'vet': {
      'name': String,
      'address': String
    },
    'ears': [
      {
        'name': String
      }
    ],
    'legs': [String],
    'profileImage': Buffer,
    'more': Object,
    'array': Array,
    'validated': {
      'type': String,
      'validate' (v) { return v === 'valid'; }
    }
  });

  // Create a model with unnamed attributes
  const Cat1 = dynamoose.model('Cat1', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; },
      'default': 888
    },
    'name': {
      'type': String,
      'required': true,
      'default': 'Mittens'
    },
    'owner': String
  }, {'saveUnknown': true});

  // Create a model with a range key
  const Cat2 = dynamoose.model('Cat2', {
    'ownerId': {
      'type': Number,
      'hashKey': true
    },
    'name': {
      'type': String,
      'rangeKey': true
    }
  });

  // Create a model with required attributes
  const Cat3 = dynamoose.model('Cat3', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; },
      'default': 888
    },
    'name': {
      'type': String,
      'required': true,
      'default': 'Mittens'
    },
    'owner': String,
    'age': {
      'type': Number,
      'required': true
    }
  });

  // Create a model with timestamps
  const Cat4 = dynamoose.model('Cat4', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; }
    },
    'name': {
      'type': String,
      'default': 'Bobo'
    }
  },
  {
    'timestamps': {
      'createdAt': 'myLittleCreatedAt',
      'updatedAt': 'myLittleUpdatedAt'
    }
  });

  // Create a model with unnamed attributes
  const Cat5 = dynamoose.model('Cat5', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; },
      'default': 888
    },
    'name': {
      'type': String,
      'required': true,
      'default': 'Mittens'
    },
    'owner': String
  },
  {
    'saveUnknown': true
  });

  const Cat6 = dynamoose.model('Cat6', {
    'id': {
      'type': Number
    },
    'name': {
      'type': String
    },
    'parent': {
      'type': Number,
      'ref': 'Cat6'
    }
  });

  const Cat7 = dynamoose.model('Cat7', {
    'id': {
      'type': Number,
      'hashKey': true
    },
    'name': {
      'type': String
    },
    'parent': Number,
    'isHappy': Boolean
  }, {'useDocumentTypes': false, 'useNativeBooleans': false});

  const Cat8 = dynamoose.model('Cat8', {
    'id': {
      'type': Number,
      'hashKey': true
    },
    'age': {
      'type': Number,
      'rangeKey': true
    }
  });

  const CatWithOwner = dynamoose.model('CatWithOwner', {
    'id': {
      'type': Number
    },
    'name': {
      'type': String
    },
    'owner': {
      'name': String,
      'address': String
    }
  });

  const Owner = dynamoose.model('Owner', {
    'name': {
      'type': String,
      'hashKey': true
    },
    'address': {
      'type': String,
      'rangeKey': true
    },
    'phoneNumber': String
  });

  const ExpiringCat = dynamoose.model('ExpiringCat', {
    'name': String
  }, {'expires': NINE_YEARS});

  const ExpiringCatNull = dynamoose.model('ExpiringCatNull', {
    'name': String
  },
  {
    'expires': {
      'ttl': NINE_YEARS,
      'attribute': 'expires',
      'defaultExpires' () {
        return null;
      }
    }
  });

  const ExpiringCatNoReturn = dynamoose.model('ExpiringCatNoReturn', {
    'name': String
  }, {
    'expires': {
      'ttl': NINE_YEARS,
      'attribute': 'expires',
      'returnExpiredItems': false,
      'defaultExpires' () {
        return null;
      }
    }
  });

  const ExpiringCatReturnTrue = dynamoose.model('ExpiringCatReturnTrue', {
    'name': String
  }, {
    'expires': {
      'ttl': NINE_YEARS,
      'attribute': 'expires',
      'returnExpiredItems': true,
      'defaultExpires' () {
        return null;
      }
    }
  });

  const CatWithGeneratedID = dynamoose.model('CatWithGeneratedID', {
    'id': {
      'type': String,
      'default' (model) {
        return `${model.owner.name}_${model.name}`;
      },
      'validate' (value, model) {
        return value === `${model.owner.name}_${model.name}`;
      }
    },
    'name': {
      'type': String
    },
    'owner': {
      'name': String,
      'address': String
    }
  });

  const CatModel = dynamoose.model('CatDefault', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; }
    },
    'name': String,
    'owner': String,
    'shouldRemainUnchanged': {
      'type': String,
      'default' (model) {
        return `shouldRemainUnchanged_${model.name}_${model.owner}`;
      }
    },
    'shouldBeChanged': {
      'type': String,
      'default' (model) {
        return `shouldBeChanged_${model.name}_${model.owner}`;
      }
    },
    'shouldAlwaysBeChanged': {
      'type': String,
      'default' (model) {
        return `shouldAlwaysBeChanged_${model.name}_${model.owner}`;
      },
      'forceDefault': true
    },
    'unsetShouldBeChanged': {
      'type': String,
      'default' (model) {
        return `unsetShouldBeChanged_${model.name}_${model.owner}`;
      }
    },
    'unsetShouldAlwaysBeChanged': {
      'type': String,
      'default' (model) {
        return `unsetShouldAlwaysBeChanged_${model.name}_${model.owner}`;
      }
    }
  });

  const Cat9 = dynamoose.model('Cat9', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; }
    },
    'name': String,
    'owner': String,
    'age': {'type': Number},
    'vet': {
      'name': String,
      'address': String
    },
    'ears': [
      {
        'name': String
      }
    ],
    'legs': [String],
    'more': Object,
    'array': Array,
    'validated': {
      'type': String,
      'validate' (v) { return v === 'valid'; }
    }
  }, {'timestamps': true});

  const Cat10 = dynamoose.model('Cat10', {
    'id': {
      'type': Number,
      'hashKey': true
    },
    'isHappy': Boolean,
    'parents': Array,
    'details': Object
  }, {'useDocumentTypes': false, 'useNativeBooleans': false});

  const Cat11 = dynamoose.model('Cat11', {
    'id': {
      'type': Number,
      'validate' (v) {
        return v > 0;
      }
    },
    'name': String,
    'owner': String,
    'age': {
      'type': Number
    },
    'vet': {
      'name': String,
      'address': String
    },
    'ears': [
      {
        'name': String
      }
    ],
    'legs': [String],
    'more': Object,
    'array': Array,
    'validated': {
      'type': String,
      'validate' (v) {
        return v === 'valid';
      }
    }
  }, {
    'useDocumentTypes': true,
    'expires': NINE_YEARS
  });

  const Cat12 = dynamoose.model('Cat12',
    {
      '_id': {
        'type': Number,
        'validate' (v) { return v > 0; }
      },
      'name': String
    });

  const Cat13 = dynamoose.model('Cat13', {
    'id': {
      'type': Number,
      'validate' (v) { return v > 0; }
    },
    'items': {
      'type': 'list',
      'list': [
        {
          'name': {
            'type': String,
            'required': true
          },
          'amount': {
            'type': Number,
            'required': true
          }
        }
      ]
    }
  });

  const CatWithMethodsSchema = new dynamoose.Schema({
    'id': Number,
    'name': String
  });
  CatWithMethodsSchema.method('getModel', function (modelName) {
    return this.model(modelName);
  });
  const CatWithMethods = dynamoose.model('CatWithMethods', CatWithMethodsSchema);

  const ReturnValuesNoneCat = dynamoose.model('ReturnValuesNoneCat', {
    'id': Number,
    'name': String
  }, {
    'defaultReturnValues': 'NONE'
  });

  const SharedTableCat1 = new dynamoose.Schema({
    'id': Number,
    'name': String,
    'breed': String
  });
  const SharedTableCat2 = new dynamoose.Schema({
    'id': Number,
    'name': String,
    'color': String
  });
  const CatWithBreed = dynamoose.model('CatWithBreed', SharedTableCat1, {
    'tableName': 'shared-cat'
  });
  const CatWithColor = dynamoose.model('CatWithColor', SharedTableCat2, {
    'tableName': 'shared-cat'
  });

  return {
    Cat,
    Cat1,
    Cat2,
    Cat3,
    Cat4,
    Cat5,
    Cat6,
    Cat7,
    Cat8,
    Cat9,
    Cat10,
    Cat11,
    Cat12,
    Cat13,
    CatWithOwner,
    Owner,
    ExpiringCat,
    ExpiringCatNull,
    ExpiringCatNoReturn,
    ExpiringCatReturnTrue,
    CatWithGeneratedID,
    CatWithMethods,
    CatModel,
    ReturnValuesNoneCat,
    CatWithBreed,
    CatWithColor
  };
};
