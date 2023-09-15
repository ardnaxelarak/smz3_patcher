$(function() {
  $(".submit-btn").prop("disabled", true);
  $.ajaxSetup({
    beforeSend: function (jqXHR, settings) {
      if (settings.dataType === 'binary')
        settings.xhr = () => $.extend(new window.XMLHttpRequest(), {responseType:'arraybuffer'})
    }
  });
  $(".patch").on("change", async function() {
    await download_patch($(this).data("filename"));
  });
  $(".submit-btn").on("click", submit);
  $("#romInput").on("change", function() {
    $(".submit-btn").prop("disabled", $(this).prop('files').length == 0);
  });
});

function apply_patch(patch, rom, transformer) {
  const header = 5;
  const footer = 3;
  var pos = header;
  while (pos + footer < patch.length) {
    const offset = (patch[pos++] << 16) | (patch[pos++] << 8) | patch[pos++];
    const trOffset = transformer(offset);
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

async function read_file(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(file);
  });
}

const patchMap = {};

async function download_patch(filename) {
  if (!patchMap[filename]) {
    patchMap[filename] = await $.ajax({
      url: filename,
      type: "GET",
      dataType: "binary",
    }).then(function (response) {
      const data = new Uint8Array(response);
      return data;
    });
  }
  return patchMap[filename];
}

async function submit() {
  const romFile = document.getElementById('romInput').files[0];
  const rom = await read_file(romFile);

  for (const p of $(".sm-patch:checked")) {
    const $patch = $(p);
    const patch = await download_patch($patch.data('filename'));
    apply_patch(patch, rom, translate_sm_offset);
  }

  const customPatches = document.getElementById('patchInput').files;
  for (const patchFile of customPatches) {
    const patch = await read_file(patchFile);
    apply_patch(patch, rom, translate_sm_offset);
  }

  const blob = new Blob([rom], { type: 'octet/stream' });
  const link = document.getElementById('downloader');
  link.href = URL.createObjectURL(blob);
  link.download = romFile.name.replace(/\.sfc$/, "") + "_patched.sfc";
  link.click();
}
