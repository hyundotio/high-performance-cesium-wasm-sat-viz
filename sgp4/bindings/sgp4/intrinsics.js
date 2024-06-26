
function clamp_guest(i, min, max) {
  if (i < min || i > max) throw new RangeError(`must be between ${min} and ${max}`);
  return i;
}

let DATA_VIEW = new DataView(new ArrayBuffer());

function data_view(mem) {
  if (DATA_VIEW.buffer !== mem.buffer) DATA_VIEW = new DataView(mem.buffer);
  return DATA_VIEW;
}

function to_string(val) {
  if (typeof val === 'symbol') {
    throw new TypeError('symbols cannot be converted to strings');
  } else {
    // Calling `String` almost directly calls `ToString`, except that it also allows symbols,
    // which is why we have the symbol-rejecting branch above.
    //
    // Definition of `String`: https://tc39.es/ecma262/#sec-string-constructor-string-value
    return String(val);
  }
}
const UTF8_DECODER = new TextDecoder('utf-8');

const UTF8_ENCODER = new TextEncoder('utf-8');

function utf8_encode(s, realloc, memory) {
  if (typeof s !== 'string') throw new TypeError('expected a string');
  
  if (s.length === 0) {
    UTF8_ENCODED_LEN = 0;
    return 1;
  }
  
  let alloc_len = 0;
  let ptr = 0;
  let writtenTotal = 0;
  while (s.length > 0) {
    ptr = realloc(ptr, alloc_len, 1, alloc_len + s.length);
    alloc_len += s.length;
    const { read, written } = UTF8_ENCODER.encodeInto(
    s,
    new Uint8Array(memory.buffer, ptr + writtenTotal, alloc_len - writtenTotal),
    );
    writtenTotal += written;
    s = s.slice(read);
  }
  if (alloc_len > writtenTotal)
  ptr = realloc(ptr, alloc_len, 1, writtenTotal);
  UTF8_ENCODED_LEN = writtenTotal;
  return ptr;
}

let UTF8_ENCODED_LEN = 0;

function utf8_encoded_len() {
  return UTF8_ENCODED_LEN;
}

class Slab {
  constructor() {
    this.list = [];
    this.head = 0;
  }
  
  insert(val) {
    if (this.head >= this.list.length) {
      this.list.push({
        next: this.list.length + 1,
        val: undefined,
      });
    }
    const ret = this.head;
    const slot = this.list[ret];
    this.head = slot.next;
    slot.next = -1;
    slot.val = val;
    return ret;
  }
  
  get(idx) {
    if (idx >= this.list.length)
    throw new RangeError('handle index not valid');
    const slot = this.list[idx];
    if (slot.next === -1)
    return slot.val;
    throw new RangeError('handle index not valid');
  }
  
  remove(idx) {
    const ret = this.get(idx); // validate the slot
    const slot = this.list[idx];
    slot.val = undefined;
    slot.next = this.head;
    this.head = idx;
    return ret;
  }
}

module.exports = { clamp_guest, data_view, to_string, UTF8_DECODER, utf8_encode, utf8_encoded_len, Slab };
