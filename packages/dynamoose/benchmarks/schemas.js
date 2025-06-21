const dynamoose = require("../dist");

// Small schema for baseline comparison
const createSmallSchema = () => new dynamoose.Schema({
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
const createMediumSchema = () => new dynamoose.Schema({
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
		"storage": "iso",
		"default": Date.now
	},
	"updatedAt": {
		"type": Date,
		"storage": "iso",
		"default": Date.now
	}
});

// Large schema with high complexity
const createLargeSchema = () => new dynamoose.Schema({
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
				"type": Date,
				"storage": "iso"
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
							"enum": ["home", "work", "billing", "shipping", "other"]
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
						"type": Date,
						"storage": "iso"
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
							"type": Date,
							"storage": "iso"
						},
						"endDate": {
							"type": Date,
							"storage": "iso"
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
							"enum": ["beginner", "intermediate", "advanced", "expert"]
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
							"type": Date,
							"storage": "iso"
						},
						"endDate": {
							"type": Date,
							"storage": "iso"
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
							"type": Date,
							"storage": "iso"
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
					"type": Date,
					"storage": "iso"
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
						"type": Date,
						"storage": "iso"
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
				"type": Date,
				"storage": "iso"
			},
			"field5": Object,
			"field6": Array,
			"field7": String,
			"field8": Number,
			"field9": Boolean,
			"field10": {
				"type": Date,
				"storage": "iso"
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
				"storage": "iso",
				"default": Date.now
			},
			"createdBy": String,
			"updatedAt": {
				"type": Date,
				"storage": "iso",
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
							"type": Date,
							"storage": "iso"
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
const createExtraLargeSchema = () => new dynamoose.Schema({
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
				"type": Date,
				"storage": "iso"
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
							"enum": ["home", "work", "billing", "shipping", "other"]
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
						"type": Date,
						"storage": "iso"
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
							"type": Date,
							"storage": "iso"
						},
						"endDate": {
							"type": Date,
							"storage": "iso"
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
							"enum": ["beginner", "intermediate", "advanced", "expert"]
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
							"type": Date,
							"storage": "iso"
						},
						"endDate": {
							"type": Date,
							"storage": "iso"
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
							"type": Date,
							"storage": "iso"
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
					"type": Date,
					"storage": "iso"
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
						"type": Date,
						"storage": "iso"
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
				"type": Date,
				"storage": "iso"
			},
			"field5": Object,
			"field6": Array,
			"field7": String,
			"field8": Number,
			"field9": Boolean,
			"field10": {
				"type": Date,
				"storage": "iso"
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
				"storage": "iso",
				"default": Date.now
			},
			"createdBy": String,
			"updatedAt": {
				"type": Date,
				"storage": "iso",
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
							"type": Date,
							"storage": "iso"
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
							"type": Date,
							"storage": "iso"
						},
						"endTime": {
							"type": Date,
							"storage": "iso"
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
													"type": Date,
													"storage": "iso"
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
							"type": Date,
							"storage": "iso"
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
													"type": Date,
													"storage": "iso"
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
													"type": Date,
													"storage": "iso"
												},
												"completedDate": {
													"type": Date,
													"storage": "iso"
												},
												"tasks": {
													"type": Array,
													"schema": [{
														"type": Object,
														"schema": {
															"id": String,
															"title": String,
															"assignee": String,
															"status": String,
															"priority": String,
															"estimatedHours": Number,
															"actualHours": Number,
															"dependencies": Array
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
	}
});

module.exports = {
	createSmallSchema,
	createMediumSchema,
	createLargeSchema,
	createExtraLargeSchema
};
