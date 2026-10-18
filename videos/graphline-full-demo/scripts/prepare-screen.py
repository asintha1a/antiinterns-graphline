import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
capture=json.loads((root/'capture-events.json').read_text())
plan=json.loads((root/'timing.json').read_text())
subprocess.run(['ffmpeg','-y','-i',str(root/'assets/capture.webm'),'-ss',str(capture['offset']),'-t',str(sum(x['duration'] for x in plan)),'-vf','fps=30','-c:v','libx264','-preset','fast','-crf','18','-g','30','-keyint_min','30','-an','-movflags','+faststart',str(root/'assets/screen.mp4')],check=True)
