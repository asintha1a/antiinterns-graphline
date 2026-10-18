import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
plan=json.loads((root/'scripts/plan.json').read_text())
start=0
for p in plan:
    txt=root/'assets'/f'{p["id"]}.txt'; txt.write_text(p['text'])
    aiff=root/'assets'/f'{p["id"]}.aiff'; wav=root/'assets'/f'{p["id"]}.wav'
    subprocess.run(['say','-v','Samantha','-r','174','-f',str(txt),'-o',str(aiff)],check=True)
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(aiff),'-ar','48000','-ac','1',str(wav)],check=True)
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(wav)]))
    p.update(start=round(start,3),speech=round(dur,3),duration=round(dur+2,3))
    start+=dur+2
    aiff.unlink()
(root/'timing.json').write_text(json.dumps(plan,indent=2))
print(json.dumps({'duration':round(start,3),'chapters':len(plan)}))
