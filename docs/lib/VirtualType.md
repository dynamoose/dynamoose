<a name="VirtualType"></a>

## VirtualType()
VirtualType constructor

This is what mongoose uses to define virtual attributes via `Schema.prototype.virtual`.

####Example:

    let fullname = schema.virtual('fullname');
    fullname instanceof mongoose.VirtualType // true

**Kind**: global function  
**Parma**: <code>Object</code> options  
**Api**: public  

* [VirtualType()](#VirtualType)
    * [.get(fn)](#VirtualType+get) ⇒ [<code>VirtualType</code>](#VirtualType)
    * [.set(fn)](#VirtualType+set) ⇒ [<code>VirtualType</code>](#VirtualType)
    * [.applyVirtuals(model)](#VirtualType+applyVirtuals) ⇒ <code>any</code>

<a name="VirtualType+get"></a>

### virtualType.get(fn) ⇒ [<code>VirtualType</code>](#VirtualType)
Defines a getter.

####Example:

    let virtual = schema.virtual('fullname');
    virtual.get(function () {
      return `${this.name.first} ${this.name.last}`;
    });

**Kind**: instance method of [<code>VirtualType</code>](#VirtualType)  
**Returns**: [<code>VirtualType</code>](#VirtualType) - this  
**Api**: public  

| Param | Type |
| --- | --- |
| fn | <code>function</code> | 

<a name="VirtualType+set"></a>

### virtualType.set(fn) ⇒ [<code>VirtualType</code>](#VirtualType)
Defines a setter.

####Example:

    let virtual = schema.virtual('fullname');
    virtual.set(function (v) {
      let parts = v.split(' ');
      this.name.first = parts[0];
      this.name.last = parts[1];
    });

**Kind**: instance method of [<code>VirtualType</code>](#VirtualType)  
**Returns**: [<code>VirtualType</code>](#VirtualType) - this  
**Api**: public  

| Param | Type |
| --- | --- |
| fn | <code>function</code> | 

<a name="VirtualType+applyVirtuals"></a>

### virtualType.applyVirtuals(model) ⇒ <code>any</code>
Applies getters and setters to the model

**Kind**: instance method of [<code>VirtualType</code>](#VirtualType)  
**Returns**: <code>any</code> - the value after applying all getters  
**Api**: public  

| Param | Type |
| --- | --- |
| model | <code>Object</code> | 

