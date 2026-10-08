/**
 * FAT32 (disque D:) fait échouer fs.readlink avec EISDIR sur un fichier
 * normal. Webpack interprète ça comme une erreur fatale. On le traduit en
 * EINVAL, le code déjà utilisé pour « ce n'est pas un lien ».
 */
const fs = require("fs");

if (process.platform === "win32") {
patchReadlink();
}

function patchReadlink() {
function asNotLink(err) {
  if (!err || err.code !== "EISDIR") return err;
  const next = new Error("EINVAL: not a symlink");
  next.code = "EINVAL";
  next.syscall = "readlink";
  next.path = err.path;
  return next;
}

const readlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  return readlink.call(fs, path, options, (err, link) => {
    callback(asNotLink(err), link);
  });
};

const readlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return readlinkSync.call(fs, path, options);
  } catch (err) {
    const mapped = asNotLink(err);
    if (mapped !== err) throw mapped;
    throw err;
  }
};

if (fs.promises?.readlink) {
  const readlinkAsync = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async function (path, options) {
    try {
      return await readlinkAsync(path, options);
    } catch (err) {
      const mapped = asNotLink(err);
      if (mapped !== err) throw mapped;
      throw err;
    }
  };
}
}
