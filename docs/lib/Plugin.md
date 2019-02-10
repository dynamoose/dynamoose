<a name="module_Plugin"></a>

## Plugin

* [Plugin](#module_Plugin)
    * [~Plugin(model, func, options, registerPlugin)](#module_Plugin..Plugin)
        * [.emit(type, stage, obj)](#module_Plugin..Plugin+emit)
    * [~setName(name)](#module_Plugin..setName)
    * [~setDescription(description)](#module_Plugin..setDescription)
    * [~on(type, stage, func)](#module_Plugin..on)

<a name="module_Plugin..Plugin"></a>

### Plugin~Plugin(model, func, options, registerPlugin)
This is a helper to bind new plugins and the events they trigger to your model.
This helper is consumed by the Model, and not directly when creating a Plugin.

**Kind**: inner method of [<code>Plugin</code>](#module_Plugin)  

| Param | Type | Description |
| --- | --- | --- |
| model | <code>class</code> | the passed in model class |
| func | <code>function</code> | the user provided plugin function |
| options | <code>object</code> | the user provided options |
| registerPlugin | <code>function</code> | the bound model plugin method |

<a name="module_Plugin..Plugin+emit"></a>

#### plugin.emit(type, stage, obj)
Sets up the model for all built listeners

**Kind**: instance method of [<code>Plugin</code>](#module_Plugin..Plugin)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | the type of model change occuring |
| stage | <code>string</code> | the stage, pre or post, of the type being emitted |
| obj | <code>object</code> | the Plugin object to configure for listeners |

<a name="module_Plugin..setName"></a>

### Plugin~setName(name)
Sets the plugin name

**Kind**: inner method of [<code>Plugin</code>](#module_Plugin)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the name of the plugin |

<a name="module_Plugin..setDescription"></a>

### Plugin~setDescription(description)
Sets the plugin description

**Kind**: inner method of [<code>Plugin</code>](#module_Plugin)  

| Param | Type | Description |
| --- | --- | --- |
| description | <code>string</code> | the description of the plugin |

<a name="module_Plugin..on"></a>

### Plugin~on(type, stage, func)
This allows for the ability for plugin to add listeners on certain events emmited from Dynamoose.
This is the function that gets called from your plugin.on() hook.

This example will reject a put if they attempt to modify a key you don't want modified.
```js
plugin.on('model:put', 'put:called', (pluginEvent) => {
   const {event, model} = pluginEvent;
   const ItemToTransform = event.item.Item;
   const mutatingKeys = Object.keys(putQuery);
   const staticOnlyKeys = 'id'
   const result = {}
   if (mutatingKeys.includes(staticOnlyKeys)) {
     result.reject = 'This key must not be included, we manage it.';
   } else {
     result.resolve = 'Good to go.'
   }
   return Promise.resolve(result)
 }
)
```

**Kind**: inner method of [<code>Plugin</code>](#module_Plugin)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>mixed</code> | if a string, sets what type to listen to, a function sets listeners on all event stages and types |
| stage | <code>mixed</code> | if a string, sets the stage to listen to, a function sets listeners on all stage for the preceding type |
| func | <code>function</code> | the function to call with the correct payloads at the defined type and stage |

