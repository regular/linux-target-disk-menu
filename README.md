# linux-target-disk-menu

prints a list of linux block devices (disks, USB sticks, etc) along with their partitions and lets the user select one (or quit). If a device was selected, outputs its device path (`/dev/xxx`) to stdout (all user interaction is on stderr). Exit code is zero if a device was selected, otherwise it's 1.

Meant to be used in shell scripts.


