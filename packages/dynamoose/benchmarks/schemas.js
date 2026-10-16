// Schemas of the benchmark, also used by the equivalence corpus (equivalence/corpus.js).
const order = require("./fixtures/order-schema");

// Small schema for baseline comparison
const createSmallSchema = (dynamoose) =>
	new dynamoose.Schema({
		"id": {
			"type": String,
			"hashKey": true
		},
		"name": String,
		"email": String,
		"age": Number,
		"active": Boolean
	});

// Medium schema with moderate complexity
const createMediumSchema = (dynamoose) =>
	new dynamoose.Schema({
		"id": {
			"type": String,
			"hashKey": true
		},
		"name": String,
		"email": {
			"type": String,
			"validate": (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
		},
		"profile": {
			"type": Object,
			"schema": {
				"firstName": String,
				"lastName": String,
				"age": Number,
				"address": {
					"type": Object,
					"schema": {
						"street": String,
						"city": String,
						"zipCode": String,
						"country": String
					}
				}
			}
		},
		"preferences": {
			"type": Object,
			"schema": {
				"theme": {
					"type": String,
					"enum": ["light", "dark"],
					"default": "light"
				},
				"notifications": Boolean,
				"language": String
			}
		},
		"tags": {
			"type": Array,
			"schema": [String]
		},
		"metadata": Object,
		"createdAt": {
			"type": Date,
			"default": Date.now
		},
		"updatedAt": {
			"type": Date,
			"default": Date.now
		}
	});

// Large schema with high complexity
const createLargeSchema = (dynamoose) =>
	new dynamoose.Schema({
		"id": {
			"type": String,
			"hashKey": true
		},
		"userId": {
			"type": String,
			"rangeKey": true
		},
		"personalInfo": {
			"type": Object,
			"schema": {
				"firstName": {
					"type": String,
					"required": true,
					"validate": (val) => val.length >= 2
				},
				"lastName": {
					"type": String,
					"required": true
				},
				"middleName": String,
				"dateOfBirth": {
					"type": Date
				},
				"gender": {
					"type": String,
					"enum": ["male", "female", "other", "prefer-not-to-say"]
				},
				"nationality": String,
				"languages": {
					"type": Array,
					"schema": [String]
				}
			}
		},
		"contactInfo": {
			"type": Object,
			"schema": {
				"primaryEmail": {
					"type": String,
					"validate": (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
				},
				"secondaryEmail": String,
				"phoneNumbers": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"type": {
								"type": String,
								"enum": ["mobile", "home", "work", "other"]
							},
							"number": String,
							"countryCode": String,
							"isPrimary": {
								"type": Boolean,
								"default": false
							}
						}
					}]
				},
				"addresses": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"type": {
								"type": String,
								"enum": [
									"home",
									"work",
									"billing",
									"shipping",
									"other"
								]
							},
							"street": String,
							"apartment": String,
							"city": String,
							"state": String,
							"zipCode": String,
							"country": String,
							"isDefault": {
								"type": Boolean,
								"default": false
							}
						}
					}]
				}
			}
		},
		"professionalInfo": {
			"type": Object,
			"schema": {
				"currentPosition": {
					"type": Object,
					"schema": {
						"title": String,
						"company": String,
						"department": String,
						"startDate": {
							"type": Date
						},
						"salary": Number,
						"currency": String
					}
				},
				"workHistory": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"title": String,
							"company": String,
							"department": String,
							"startDate": {
								"type": Date
							},
							"endDate": {
								"type": Date
							},
							"description": String,
							"achievements": {
								"type": Array,
								"schema": [String]
							}
						}
					}]
				},
				"skills": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"name": String,
							"level": {
								"type": String,
								"enum": [
									"beginner",
									"intermediate",
									"advanced",
									"expert"
								]
							},
							"yearsOfExperience": Number,
							"certifications": {
								"type": Array,
								"schema": [String]
							}
						}
					}]
				},
				"education": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"institution": String,
							"degree": String,
							"fieldOfStudy": String,
							"startDate": {
								"type": Date
							},
							"endDate": {
								"type": Date
							},
							"gpa": Number,
							"honors": {
								"type": Array,
								"schema": [String]
							}
						}
					}]
				}
			}
		},
		"preferences": {
			"type": Object,
			"schema": {
				"appearance": {
					"type": Object,
					"schema": {
						"theme": {
							"type": String,
							"enum": ["light", "dark", "auto"],
							"default": "auto"
						},
						"fontSize": {
							"type": String,
							"enum": ["small", "medium", "large"],
							"default": "medium"
						},
						"colorScheme": String
					}
				},
				"notifications": {
					"type": Object,
					"schema": {
						"email": {
							"type": Object,
							"schema": {
								"marketing": {
									"type": Boolean,
									"default": true
								},
								"product": {
									"type": Boolean,
									"default": true
								},
								"security": {
									"type": Boolean,
									"default": true
								}
							}
						},
						"push": {
							"type": Object,
							"schema": {
								"enabled": {
									"type": Boolean,
									"default": true
								},
								"frequency": {
									"type": String,
									"enum": ["immediate", "daily", "weekly"],
									"default": "immediate"
								}
							}
						},
						"sms": {
							"type": Object,
							"schema": {
								"enabled": {
									"type": Boolean,
									"default": false
								},
								"emergencyOnly": {
									"type": Boolean,
									"default": true
								}
							}
						}
					}
				},
				"privacy": {
					"type": Object,
					"schema": {
						"profileVisibility": {
							"type": String,
							"enum": ["public", "friends", "private"],
							"default": "friends"
						},
						"dataSharing": {
							"type": Boolean,
							"default": false
						},
						"analytics": {
							"type": Boolean,
							"default": true
						}
					}
				}
			}
		},
		"socialConnections": {
			"type": Object,
			"schema": {
				"linkedAccounts": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"platform": String,
							"accountId": String,
							"username": String,
							"isVerified": Boolean,
							"connectedAt": {
								"type": Date
							}
						}
					}]
				},
				"friends": {
					"type": Array,
					"schema": [String]
				},
				"followers": {
					"type": Array,
					"schema": [String]
				},
				"following": {
					"type": Array,
					"schema": [String]
				}
			}
		},
		"activityLog": {
			"type": Array,
			"schema": [{
				"type": Object,
				"schema": {
					"action": String,
					"timestamp": {
						"type": Date
					},
					"ipAddress": String,
					"userAgent": String,
					"location": {
						"type": Object,
						"schema": {
							"country": String,
							"city": String,
							"latitude": Number,
							"longitude": Number
						}
					},
					"metadata": Object
				}
			}]
		},
		"settings": {
			"type": Object,
			"schema": {
				"security": {
					"type": Object,
					"schema": {
						"twoFactorEnabled": Boolean,
						"loginAlerts": Boolean,
						"passwordChangeDate": {
							"type": Date
						},
						"securityQuestions": {
							"type": Array,
							"schema": [{
								"type": Object,
								"schema": {
									"question": String,
									"answerHash": String
								}
							}]
						}
					}
				},
				"billing": {
					"type": Object,
					"schema": {
						"plan": String,
						"billingCycle": String,
						"paymentMethods": {
							"type": Array,
							"schema": [{
								"type": Object,
								"schema": {
									"type": String,
									"last4": String,
									"expiryMonth": Number,
									"expiryYear": Number,
									"isDefault": Boolean
								}
							}]
						}
					}
				}
			}
		},
		"customFields": {
			"type": Object,
			"schema": {
				"field1": String,
				"field2": Number,
				"field3": Boolean,
				"field4": {
					"type": Date
				},
				"field5": Object,
				"field6": Array,
				"field7": String,
				"field8": Number,
				"field9": Boolean,
				"field10": {
					"type": Date
				}
			}
		},
		"metadata": {
			"type": Object,
			"schema": {
				"version": Number,
				"source": String,
				"importedFrom": String,
				"tags": Array,
				"flags": Array,
				"experiments": Object
			}
		},
		"audit": {
			"type": Object,
			"schema": {
				"createdAt": {
					"type": Date,

					"default": Date.now
				},
				"createdBy": String,
				"updatedAt": {
					"type": Date,

					"default": Date.now
				},
				"updatedBy": String,
				"version": Number,
				"changeLog": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"timestamp": {
								"type": Date
							},
							"userId": String,
							"action": String,
							"changes": Object,
							"reason": String
						}
					}]
				}
			}
		}
	});

// Extra large schema with maximum complexity
const createExtraLargeSchema = (dynamoose) =>
	new dynamoose.Schema({
		"id": {
			"type": String,
			"hashKey": true
		},
		"userId": {
			"type": String,
			"rangeKey": true
		},
		"personalInfo": {
			"type": Object,
			"schema": {
				"firstName": {
					"type": String,
					"required": true,
					"validate": (val) => val.length >= 2
				},
				"lastName": {
					"type": String,
					"required": true
				},
				"middleName": String,
				"dateOfBirth": {
					"type": Date
				},
				"gender": {
					"type": String,
					"enum": ["male", "female", "other", "prefer-not-to-say"]
				},
				"nationality": String,
				"languages": {
					"type": Array,
					"schema": [String]
				}
			}
		},
		"contactInfo": {
			"type": Object,
			"schema": {
				"primaryEmail": {
					"type": String,
					"validate": (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
				},
				"secondaryEmail": String,
				"phoneNumbers": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"type": {
								"type": String,
								"enum": ["mobile", "home", "work", "other"]
							},
							"number": String,
							"countryCode": String,
							"isPrimary": {
								"type": Boolean,
								"default": false
							}
						}
					}]
				},
				"addresses": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"type": {
								"type": String,
								"enum": [
									"home",
									"work",
									"billing",
									"shipping",
									"other"
								]
							},
							"street": String,
							"apartment": String,
							"city": String,
							"state": String,
							"zipCode": String,
							"country": String,
							"isDefault": {
								"type": Boolean,
								"default": false
							}
						}
					}]
				}
			}
		},
		"professionalInfo": {
			"type": Object,
			"schema": {
				"currentPosition": {
					"type": Object,
					"schema": {
						"title": String,
						"company": String,
						"department": String,
						"startDate": {
							"type": Date
						},
						"salary": Number,
						"currency": String
					}
				},
				"workHistory": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"title": String,
							"company": String,
							"department": String,
							"startDate": {
								"type": Date
							},
							"endDate": {
								"type": Date
							},
							"description": String,
							"achievements": {
								"type": Array,
								"schema": [String]
							}
						}
					}]
				},
				"skills": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"name": String,
							"level": {
								"type": String,
								"enum": [
									"beginner",
									"intermediate",
									"advanced",
									"expert"
								]
							},
							"yearsOfExperience": Number,
							"certifications": {
								"type": Array,
								"schema": [String]
							}
						}
					}]
				},
				"education": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"institution": String,
							"degree": String,
							"fieldOfStudy": String,
							"startDate": {
								"type": Date
							},
							"endDate": {
								"type": Date
							},
							"gpa": Number,
							"honors": {
								"type": Array,
								"schema": [String]
							}
						}
					}]
				}
			}
		},
		"preferences": {
			"type": Object,
			"schema": {
				"appearance": {
					"type": Object,
					"schema": {
						"theme": {
							"type": String,
							"enum": ["light", "dark", "auto"],
							"default": "auto"
						},
						"fontSize": {
							"type": String,
							"enum": ["small", "medium", "large"],
							"default": "medium"
						},
						"colorScheme": String
					}
				},
				"notifications": {
					"type": Object,
					"schema": {
						"email": {
							"type": Object,
							"schema": {
								"marketing": {
									"type": Boolean,
									"default": true
								},
								"product": {
									"type": Boolean,
									"default": true
								},
								"security": {
									"type": Boolean,
									"default": true
								}
							}
						},
						"push": {
							"type": Object,
							"schema": {
								"enabled": {
									"type": Boolean,
									"default": true
								},
								"frequency": {
									"type": String,
									"enum": ["immediate", "daily", "weekly"],
									"default": "immediate"
								}
							}
						},
						"sms": {
							"type": Object,
							"schema": {
								"enabled": {
									"type": Boolean,
									"default": false
								},
								"emergencyOnly": {
									"type": Boolean,
									"default": true
								}
							}
						}
					}
				},
				"privacy": {
					"type": Object,
					"schema": {
						"profileVisibility": {
							"type": String,
							"enum": ["public", "friends", "private"],
							"default": "friends"
						},
						"dataSharing": {
							"type": Boolean,
							"default": false
						},
						"analytics": {
							"type": Boolean,
							"default": true
						}
					}
				}
			}
		},
		"socialConnections": {
			"type": Object,
			"schema": {
				"linkedAccounts": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"platform": String,
							"accountId": String,
							"username": String,
							"isVerified": Boolean,
							"connectedAt": {
								"type": Date
							}
						}
					}]
				},
				"friends": {
					"type": Array,
					"schema": [String]
				},
				"followers": {
					"type": Array,
					"schema": [String]
				},
				"following": {
					"type": Array,
					"schema": [String]
				}
			}
		},
		"activityLog": {
			"type": Array,
			"schema": [{
				"type": Object,
				"schema": {
					"action": String,
					"timestamp": {
						"type": Date
					},
					"ipAddress": String,
					"userAgent": String,
					"location": {
						"type": Object,
						"schema": {
							"country": String,
							"city": String,
							"latitude": Number,
							"longitude": Number
						}
					},
					"metadata": Object
				}
			}]
		},
		"settings": {
			"type": Object,
			"schema": {
				"security": {
					"type": Object,
					"schema": {
						"twoFactorEnabled": Boolean,
						"loginAlerts": Boolean,
						"passwordChangeDate": {
							"type": Date
						},
						"securityQuestions": {
							"type": Array,
							"schema": [{
								"type": Object,
								"schema": {
									"question": String,
									"answerHash": String
								}
							}]
						}
					}
				},
				"billing": {
					"type": Object,
					"schema": {
						"plan": String,
						"billingCycle": String,
						"paymentMethods": {
							"type": Array,
							"schema": [{
								"type": Object,
								"schema": {
									"type": String,
									"last4": String,
									"expiryMonth": Number,
									"expiryYear": Number,
									"isDefault": Boolean
								}
							}]
						}
					}
				}
			}
		},
		"customFields": {
			"type": Object,
			"schema": {
				"field1": String,
				"field2": Number,
				"field3": Boolean,
				"field4": {
					"type": Date
				},
				"field5": Object,
				"field6": Array,
				"field7": String,
				"field8": Number,
				"field9": Boolean,
				"field10": {
					"type": Date
				}
			}
		},
		"metadata": {
			"type": Object,
			"schema": {
				"version": Number,
				"source": String,
				"importedFrom": String,
				"tags": Array,
				"flags": Array,
				"experiments": Object
			}
		},
		"audit": {
			"type": Object,
			"schema": {
				"createdAt": {
					"type": Date,

					"default": Date.now
				},
				"createdBy": String,
				"updatedAt": {
					"type": Date,

					"default": Date.now
				},
				"updatedBy": String,
				"version": Number,
				"changeLog": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"timestamp": {
								"type": Date
							},
							"userId": String,
							"action": String,
							"changes": Object,
							"reason": String
						}
					}]
				}
			}
		},
		"complexAnalytics": {
			"type": Object,
			"schema": {
				"behaviorData": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"sessionId": String,
							"startTime": {
								"type": Date
							},
							"endTime": {
								"type": Date
							},
							"pageViews": {
								"type": Array,
								"schema": [{
									"type": Object,
									"schema": {
										"url": String,
										"title": String,
										"timeSpent": Number,
										"interactions": {
											"type": Array,
											"schema": [{
												"type": Object,
												"schema": {
													"type": String,
													"element": String,
													"timestamp": {
														"type": Date
													},
													"coordinates": Object
												}
											}]
										}
									}
								}]
							},
							"deviceInfo": Object
						}
					}]
				},
				"performanceMetrics": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"timestamp": {
								"type": Date
							},
							"metric": String,
							"value": Number,
							"unit": String,
							"context": Object
						}
					}]
				}
			}
		},
		"businessData": {
			"type": Object,
			"schema": {
				"companies": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"id": String,
							"name": String,
							"industry": String,
							"size": String,
							"revenue": Number,
							"employees": {
								"type": Array,
								"schema": [{
									"type": Object,
									"schema": {
										"id": String,
										"name": String,
										"position": String,
										"department": String,
										"reports": {
											"type": Array,
											"schema": [{
												"type": Object,
												"schema": {
													"id": String,
													"title": String,
													"data": Object,
													"generatedAt": {
														"type": Date
													}
												}
											}]
										}
									}
								}]
							},
							"projects": {
								"type": Array,
								"schema": [{
									"type": Object,
									"schema": {
										"id": String,
										"name": String,
										"status": String,
										"milestones": {
											"type": Array,
											"schema": [{
												"type": Object,
												"schema": {
													"id": String,
													"title": String,
													"dueDate": {
														"type": Date
													},
													"completedDate": {
														"type": Date
													},
													"tasks": {
														"type": Array,
														"schema": [{
															"type": Object,
															"schema": {
																"id": String,
																"title": String,
																"assignee":
																	String,
																"status":
																	String,
																"priority":
																	String,
																"estimatedHours":
																	Number,
																"actualHours":
																	Number,
																"dependencies":
																	Array
															}
														}]
													}
												}
											}]
										}
									}
								}]
							}
						}
					}]
				}
			}
		},
		"complexDataTypes": {
			"type": Object,
			"schema": {
				"stringSet": {
					"type": Set,
					"schema": [String]
				},
				"numberSet": {
					"type": Set,
					"schema": [Number]
				},
				"binaryData": Buffer,
				"bufferSet": {
					"type": Set,
					"schema": [Buffer]
				},
				"multiType": [String, Number],
				"nullableField": dynamoose.type.NULL,
				"constantValue": {
					"type": String,
					"default": "EXTRA_LARGE_SCHEMA"
				},
				"combinedIds": String,
				"dateWithOptions": {
					"type": Date,
					"storage": "iso"
				},
				"nestedSets": {
					"type": Object,
					"schema": {
						"tags": {
							"type": Set,
							"schema": [String]
						},
						"scores": {
							"type": Set,
							"schema": [Number]
						}
					}
				}
			}
		}
	});

// Test data generators for different schema types
// The ids are a counter, not a random value or a timestamp: a benchmark compares runs, so the same
// call sequence must build the same items every time.
let itemSequence = 0;

function generateTestData (schemaType) {
	itemSequence += 1;
	switch (schemaType) {
	case "small":
		return {
			"id": `small-${itemSequence}`,
			"name": "Test User",
			"email": "test@example.com",
			"age": 25,
			"active": true
		};

	case "medium":
		return {
			"id": `medium-${itemSequence}`,
			"name": "John Doe",
			"email": "john.doe@example.com",
			"profile": {
				"firstName": "John",
				"lastName": "Doe",
				"age": 30
			},
			"preferences": {
				"theme": "dark",
				"notifications": true,
				"language": "en"
			},
			"tags": ["user", "premium", "verified"],
			"metadata": {
				"source": "web",
				"campaign": "signup_2024"
			},
			"version": 1,
			"createdAt": new Date(),
			"updatedAt": new Date()
		};

	case "large":
		return {
			"id": `large-${itemSequence}`,
			"userId": `user-${itemSequence}`,
			"personalInfo": {
				"firstName": "John",
				"lastName": "Doe",
				"dateOfBirth": new Date("1990-01-01"),
				"gender": "male",
				"nationality": "US",
				"languages": ["English", "Spanish"]
			},
			"contactInfo": {
				"primaryEmail": "john.doe@example.com",
				"secondaryEmail": "john.personal@example.com",
				"phoneNumbers": [{
					"type": "mobile",
					"number": "+1234567890",
					"countryCode": "+1",
					"isPrimary": true
				}],
				"addresses": [{
					"type": "home",
					"street": "123 Main St",
					"city": "New York",
					"state": "NY",
					"zipCode": "10001",
					"country": "US",
					"isDefault": true
				}]
			},
			"professionalInfo": {
				"currentPosition": {
					"title": "Software Engineer",
					"company": "Tech Corp",
					"department": "Engineering",
					"startDate": new Date("2020-01-01"),
					"salary": 100000,
					"currency": "USD"
				},
				"workHistory": [{
					"title": "Junior Developer",
					"company": "Previous Corp",
					"startDate": new Date("2018-01-01"),
					"endDate": new Date("2019-12-31"),
					"description": "Developed web applications",
					"achievements": ["Improved performance by 20%"]
				}],
				"skills": [{
					"name": "JavaScript",
					"level": "advanced",
					"yearsOfExperience": 5,
					"certifications": ["AWS Certified"]
				}],
				"education": [{
					"institution": "University of Technology",
					"degree": "Bachelor",
					"fieldOfStudy": "Computer Science",
					"startDate": new Date("2014-09-01"),
					"endDate": new Date("2018-05-31"),
					"gpa": 3.8,
					"honors": ["Magna Cum Laude"]
				}]
			},
			"preferences": {
				"appearance": {
					"theme": "dark",
					"fontSize": "medium",
					"colorScheme": "blue"
				},
				"notifications": {
					"email": {
						"marketing": true,
						"product": true,
						"security": true
					},
					"push": {
						"enabled": true,
						"frequency": "immediate"
					},
					"sms": {
						"enabled": false,
						"emergencyOnly": true
					}
				},
				"privacy": {
					"profileVisibility": "friends",
					"dataSharing": false,
					"analytics": true
				}
			},
			"socialConnections": {
				"linkedAccounts": [{
					"platform": "github",
					"accountId": "johndoe123",
					"username": "johndoe",
					"isVerified": true,
					"connectedAt": new Date()
				}],
				"friends": ["friend1", "friend2"],
				"followers": ["follower1"],
				"following": ["following1"]
			},
			"activityLog": [{
				"action": "login",
				"timestamp": new Date(),
				"ipAddress": "192.168.1.1",
				"userAgent": "Mozilla/5.0",
				"location": {
					"country": "US",
					"city": "New York",
					"latitude": 40.7128,
					"longitude": -74.0060
				},
				"metadata": {"source": "web"}
			}],
			"settings": {
				"security": {
					"twoFactorEnabled": false,
					"loginAlerts": true,
					"passwordChangeDate": new Date(),
					"securityQuestions": [{
						"question": "What is your pet's name?",
						"answerHash": "hashed_answer"
					}]
				},
				"billing": {
					"plan": "premium",
					"billingCycle": "monthly",
					"paymentMethods": [{
						"type": "credit_card",
						"last4": "1234",
						"expiryMonth": 12,
						"expiryYear": 2025,
						"isDefault": true
					}]
				}
			},
			"customFields": {
				"field1": "value1",
				"field2": 123,
				"field3": true,
				"field4": new Date(),
				"field5": {"nested": "object"},
				"field6": ["array", "values"],
				"field7": "value7",
				"field8": 456,
				"field9": false,
				"field10": new Date()
			},
			"metadata": {
				"version": 1,
				"source": "registration",
				"importedFrom": "legacy_system",
				"tags": ["premium", "active"],
				"flags": ["beta_user"],
				"experiments": {
					"activeExperiments": ["experiment1"],
					"completedExperiments": ["experiment2"]
				}
			},
			"audit": {
				"createdAt": new Date(),
				"createdBy": "system",
				"updatedAt": new Date(),
				"updatedBy": "user",
				"version": 1,
				"changeLog": [{
					"timestamp": new Date(),
					"userId": "admin",
					"action": "create",
					"changes": {"created": true},
					"reason": "Initial creation"
				}]
			}
		};

	case "extra-large": {
		const largeData = generateTestData("large");
		return {
			...largeData,
			"complexDataTypes": {
				"stringSet": new Set(["tag1", "tag2", "tag3"]),
				"numberSet": new Set([1, 2, 3, 4, 5]),
				"binaryData": Buffer.from("test binary data"),
				"bufferSet": new Set([Buffer.from("data1"), Buffer.from("data2")]),
				"multiType": itemSequence % 2 === 0 ? "stringValue" : 42,
				"nullableField": null,
				"constantValue": "EXTRA_LARGE_SCHEMA",
				"combinedIds": `${Date.now()}-combined`,
				"dateWithOptions": new Date(),
				"nestedSets": {
					"tags": new Set(["performance", "benchmark", "test"]),
					"scores": new Set([95, 87, 92])
				}
			},
			"complexAnalytics": {
				"behaviorData": [{
					"sessionId": `session-${itemSequence}`,
					"startTime": new Date(Date.now() - 3600000),
					"endTime": new Date(),
					"pageViews": [{
						"url": "/home",
						"title": "Home Page",
						"timeSpent": 120000,
						"interactions": [{
							"type": "click",
							"element": "button-cta",
							"timestamp": new Date(),
							"coordinates": {"x": 500, "y": 300}
						}]
					}],
					"deviceInfo": {
						"browser": "Chrome",
						"browserVersion": "91.0",
						"os": "macOS",
						"osVersion": "11.0",
						"device": "desktop",
						"screenResolution": "1920x1080",
						"viewport": {"width": 1920, "height": 1080}
					}
				}],
				"performanceMetrics": [{
					"timestamp": new Date(),
					"metric": "page_load_time",
					"value": 1200,
					"unit": "ms",
					"context": {"page": "/home"}
				}]
			},
			"businessData": {
				"companies": [{
					"id": "company-1",
					"name": "Tech Corp",
					"industry": "Technology",
					"size": "large",
					"revenue": 10000000,
					"employees": [{
						"id": "emp-1",
						"name": "John Doe",
						"position": "Engineer",
						"department": "Engineering",
						"reports": [{
							"id": "report-1",
							"title": "Monthly Report",
							"data": {"content": "performance report"},
							"generatedAt": new Date()
						}]
					}],
					"projects": [{
						"id": "proj-1",
						"name": "Web Platform",
						"status": "active",
						"milestones": [{
							"id": "milestone-1",
							"title": "MVP Release",
							"dueDate": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
							"tasks": [{
								"id": "task-1",
								"title": "Implement authentication",
								"assignee": "emp-1",
								"status": "in-progress",
								"priority": "high",
								"estimatedHours": 40,
								"actualHours": 35,
								"dependencies": []
							}]
						}]
					}]
				}]
			}
		};
	}

	default:
		return generateTestData("small");
	}
}

// The schema configs the benchmark (benchmark.js) and the equivalence suite (equivalence/corpus.js) use.
const compositeKey = (data) => ({"id": data.id, "userId": data.userId});
const schemas = {
	"small": {
		"create": createSmallSchema,
		"data": () => generateTestData("small"),
		"key": (data) => ({"id": data.id}),
		"update": () => ({"name": "Updated Name"})
	},
	"medium": {
		"create": createMediumSchema,
		"data": () => generateTestData("medium"),
		"key": (data) => ({"id": data.id}),
		"update": () => ({"profile": {...generateTestData("medium").profile, "firstName": "Updated"}}),
		"nestedUpdate": () => ({"$SET": {"profile.firstName": "Updated"}})
	},
	"large": {
		"create": createLargeSchema,
		"data": () => generateTestData("large"),
		"key": compositeKey,
		"update": () => ({"personalInfo": {...generateTestData("large").personalInfo, "firstName": "Updated"}}),
		"nestedUpdate": () => ({"$SET": {"personalInfo.firstName": "Updated"}})
	},
	"extra-large": {
		"create": createExtraLargeSchema,
		"data": () => generateTestData("extra-large"),
		"key": compositeKey,
		"update": () => ({"personalInfo": {...generateTestData("extra-large").personalInfo, "firstName": "Updated"}}),
		"nestedUpdate": () => ({"$SET": {"personalInfo.firstName": "Updated"}})
	},
	[order.name]: order
};
module.exports = {
	createSmallSchema,
	createMediumSchema,
	createLargeSchema,
	createExtraLargeSchema,
	generateTestData,
	schemas
};
