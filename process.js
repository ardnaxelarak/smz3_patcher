function apply_patch(patch, rom, transformer) {
  const header = 5;
  const footer = 3;
  var pos = header;
  while (pos + footer < patch.length) {
    const offset = (patch[pos++] << 16) | (patch[pos++] << 8) | patch[pos++];
    const trOffset = transformer(offset);
    console.log(offset.toString(16) + " : " + trOffset.toString(16));
    var size = (patch[pos++] << 8) | patch[pos++];
    if (size > 0) {
      rom.set(patch.subarray(pos, pos + size), trOffset);
      pos += size;
    } else {
      size = (patch[pos++] << 8) | patch[pos++];
      const value = patch[pos++];
      rom.fill(value, trOffset, trOffset + size);
    }
  }
}

function translate_sm_offset(offset) {
  if (offset >= 0x300000) {
    throw new Error("Bad SM offset");
  }

  const isHiBank = offset < 0x200000;
  const baseOffset = isHiBank ? offset : offset - 0x200000;
  var i = Math.floor(baseOffset / 0x8000);
  if (isHiBank) {
    i++;
  }
  return baseOffset + (i * 0x8000);
}

function read_file(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(file);
  });
}

async function submit() {
  const patchFile = document.getElementById('patchInput').files[0];
  const patch = await read_file(patchFile);
  const romFile = document.getElementById('romInput').files[0];
  const rom = await read_file(romFile);

  apply_patch(patch, rom, translate_sm_offset);
  const blob = new Blob([rom], { type: 'octet/stream' });
  const link = document.getElementById('downloader');
  link.href = URL.createObjectURL(blob);
  link.download = romFile.name;
  link.click();
}
