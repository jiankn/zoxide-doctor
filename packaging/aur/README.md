# zoxide-doctor AUR package template

This directory contains a source package for the Arch User Repository. It
installs the existing zero-dependency Node.js CLI from the public `v0.1.0` tag.
The package URL deliberately points to the user-facing diagnostic guide rather
than claiming to be the upstream zoxide project.

## Before submitting

1. On an Arch Linux system, run `makepkg -sfc` in this directory. It must build
   and the installed `zoxide-doctor --help` command must work.
2. Run `makepkg --printsrcinfo > .SRCINFO` and compare it with the tracked
   file after any metadata change.
3. Replace the maintainer placeholder in `PKGBUILD` with a contact address you
   are willing to publish. AUR commits are public and difficult to rewrite.
4. Confirm that `zoxide-doctor` still does not exist in the official Arch
   repositories or AUR immediately before pushing.

## AUR submission

Create an AUR account and add a new dedicated SSH public key in **My Account**.
Then clone the empty package repository, copy `PKGBUILD`, `.SRCINFO`, and
`LICENSE` into it, and push the `master` branch.

```sh
git -c init.defaultBranch=master clone ssh://aur@aur.archlinux.org/zoxide-doctor.git
cd zoxide-doctor
cp /path/to/zoxide-doctor/packaging/aur/PKGBUILD .
cp /path/to/zoxide-doctor/packaging/aur/.SRCINFO .
cp /path/to/zoxide-doctor/packaging/aur/LICENSE .
git add PKGBUILD .SRCINFO LICENSE
git commit -m 'Initial AUR package for zoxide-doctor'
git push origin master
```

After the package page is public, audit
`https://aur.archlinux.org/packages/zoxide-doctor` for HTTP status, page robots
directives, and the rendered link to `https://zoxide.org/tools/zoxide-doctor/`.
