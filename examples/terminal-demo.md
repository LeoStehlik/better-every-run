# Terminal Demo

Record the Better Every Run terminal demo with asciinema:

```bash
asciinema rec --overwrite -q -i 1.0 -t "Better Every Run v0.5" \
  -c "bash examples/asciinema-demo.sh" \
  examples/better-every-run-v0.5.cast.txt
```

Play the committed recording locally:

```bash
asciinema play examples/better-every-run-v0.5.cast.txt
```

The script runs in a temporary directory and leaves no `.better-every-run/` state in the repo.
