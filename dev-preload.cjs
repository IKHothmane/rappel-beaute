/**
 * Préchargement du serveur de dev.
 * FAT32 renvoie EISDIR sur readlink d'un fichier normal.
 * Trois dossiers du disque sont illisibles (scandir EPERM) : on les traite comme vides
 * pour que Next puisse démarrer.
 */
const fs = require("fs");

const LOCKED = [
  "src\\app\\api\\loyalty\\card-background",
  "src\\app\\api\\admin\\organizations\\[id]\\card-background",
  "scripts",
];

function isLocked(target) {
  if (!target) return false;
  const normalized = String(target).replaceAll("/", "\\").toLowerCase();
  return LOCKED.some((part) => normalized.endsWith(part));
}

function emptyIfLocked(target, err) {
  return err && err.code === "EPERM" && isLocked(target);
}

if (process.platform === "win32") {
  patchReadlink();
  patchReaddir();
}

function patchReaddir() {
  const readdir = fs.readdir;
  fs.readdir = function (target, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    return readdir.call(fs, target, options, (err, entries) => {
      if (emptyIfLocked(target, err)) callback(null, []);
      else callback(err, entries);
    });
  };

  const readdirSync = fs.readdirSync;
  fs.readdirSync = function (target, options) {
    try {
      return readdirSync.call(fs, target, options);
    } catch (err) {
      if (emptyIfLocked(target, err)) return [];
      throw err;
    }
  };

  if (fs.promises?.readdir) {
    const readdirAsync = fs.promises.readdir.bind(fs.promises);
    fs.promises.readdir = async function (target, options) {
      try {
        return await readdirAsync(target, options);
      } catch (err) {
        if (emptyIfLocked(target, err)) return [];
        throw err;
      }
    };
  }
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
  fs.readlink = function (target, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    return readlink.call(fs, target, options, (err, link) => {
      callback(asNotLink(err), link);
    });
  };

  const readlinkSync = fs.readlinkSync;
  fs.readlinkSync = function (target, options) {
    try {
      return readlinkSync.call(fs, target, options);
    } catch (err) {
      const mapped = asNotLink(err);
      if (mapped !== err) throw mapped;
      throw err;
    }
  };

  if (fs.promises?.readlink) {
    const readlinkAsync = fs.promises.readlink.bind(fs.promises);
    fs.promises.readlink = async function (target, options) {
      try {
        return await readlinkAsync(target, options);
      } catch (err) {
        const mapped = asNotLink(err);
        if (mapped !== err) throw mapped;
        throw err;
      }
    };
  }
}
