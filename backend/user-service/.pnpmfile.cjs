// pnpm configuration to allow bcrypt to run build scripts
function readPackage(pkg, context) {
  // Allow all packages to run scripts
  if (pkg.scripts && (pkg.scripts.install || pkg.scripts.postinstall)) {
    context.log(`Allowing scripts for ${pkg.name}`)
  }
  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}
