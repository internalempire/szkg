#!/bin/zsh
# Open the existing local installation without typing daily terminal commands.
cd -- "${0:A:h}" || exit 1
if [[ ! -x .venv/bin/python ]]; then
  print "SZKG needs its Python environment before first launch."
  print "Follow the Installation section in README.md, then double-click this file again."
  read -r "?Press Return to close. "
  exit 1
fi
.venv/bin/python app.py serve
exit_code=$?
if (( exit_code != 0 )); then
  print "SZKG could not start. Check the message above and the README installation steps."
  read -r "?Press Return to close. "
fi
exit $exit_code
