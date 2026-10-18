import json,pathlib,html,re
root=pathlib.Path(__file__).resolve().parent.parent
plan=json.loads((root/'timing.json').read_text())
total=round(sum(c['duration'] for c in plan),3)
def esc(s):return html.escape(s)
chunks=[];srt=[];cid=0
for c in plan:
    words=c['text'].split();groups=[]
    # Short, readable phrases. Timing follows each locally generated narration file.
    for sentence in re.split(r'(?<=[.!?])\s+',c['text']):
        w=sentence.split()
        while w:
            n=min(12,len(w));groups.append(' '.join(w[:n]));w=w[n:]
    pos=c['start']+.2
    for group in groups:
        dur=c['speech']*len(group.split())/len(words)
        cid+=1
        chunks.append(f'<div id="caption-{cid}" class="clip caption" data-start="{pos:.3f}" data-duration="{dur:.3f}" data-track-index="5">{esc(group)}</div>')
        def stamp(t):
            ms=round(t*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
        srt.append(f'{cid}\n{stamp(pos)} --> {stamp(pos+dur)}\n{group}\n')
        pos+=dur
header=[];audio=[];anim=[];camera=[]
for j,c in enumerate(plan):
    a=c['start'];d=c['duration']
    header.append(f'<h2 id="chapter-{j}" class="clip chapter-title" data-start="{a}" data-duration="{d}" data-track-index="2">{esc(c["title"])}</h2><p id="note-{j}" class="clip chapter-note" data-start="{a}" data-duration="{d}" data-track-index="3">{esc(c["note"])}</p><i class="clip chapter-rule" id="rule-{j}" data-start="{a}" data-duration="{d}" data-track-index="4"></i>')
    audio.append(f'<audio id="voice-{j}" class="clip" src="assets/{c["id"]}.wav" data-start="{a+.2:.3f}" data-duration="{c["speech"]}" data-track-index="6" data-volume="1"></audio>')
    anim.append(f"tl.fromTo('#chapter-{j}',{{y:12,opacity:0}},{{y:0,opacity:1,duration:.45,ease:'power3.out'}},{a+.05});tl.fromTo('#rule-{j}',{{scaleX:0}},{{scaleX:1,duration:.55,ease:'power4.out'}},{a+.18});")
    def focus(t,x,y,s):
        xx=max(-(s-1)*800,min((s-1)*800,(800-x)*s))
        yy=max(-(s-1)*450,min((s-1)*450,(450-y)*s))
        camera.append((round(a+t,3),s,round(xx,2),round(yy,2)))
    focus(.2,800,450,1)
    if c['id']=='intro':focus(3,750,160,1.25);focus(d-4,800,450,1)
    elif c['id']=='inbox':focus(1.3,500,380,1.5);focus(9,1110,410,1.25);focus(d-3,800,450,1)
    elif c['id']=='delivery':focus(.7,880,740,1.35);focus(7,1260,420,1.75);focus(d-3,800,450,1)
    elif c['id']=='refund':focus(.8,900,650,1.35);focus(7,1310,510,1.8);focus(d-3,800,450,1)
    elif c['id']=='human':focus(1,900,640,1.3);focus(8,1280,470,1.7);focus(d-3,800,450,1)
    elif c['id']=='memory':focus(1,1080,160,1.25);focus(8,1220,610,1.65);focus(d-3,800,450,1)
    elif c['id']=='persistence':focus(2,830,400,1.1);focus(d-3,800,450,1)
    elif c['id']=='queries':focus(2,800,450,1);focus(9,800,450,1.03)
    elif c['id']=='graphmemory':focus(2,800,450,1.02);focus(d-3,800,450,1)
    elif c['id']=='scope':focus(2,800,450,1)
    elif c['id']=='setup':focus(2,800,450,1);focus(d-4,800,450,1)
poses=sorted(camera)
for i,(t,scale,x,y) in enumerate(poses):
    dur=min(1.15,poses[i+1][0]-t-.04) if i+1<len(poses) else 1.15
    anim.append(f"tl.to('#world',{{scale:{scale},x:{x},y:{y},duration:{max(.1,dur):.3f},ease:'power3.inOut'}},{t});")
anim.append(f"tl.fromTo('#progress',{{scaleX:0}},{{scaleX:1,duration:{total},ease:'none'}},0);")
source=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Graphline | Full project demonstration</title><script src="assets/gsap.min.js"></script><style>
@font-face{{font-family:DemoSans;src:url('assets/Arial.ttf')}}@font-face{{font-family:DemoSans;src:url('assets/Arial-Bold.ttf');font-weight:700}}
*{{box-sizing:border-box}}html,body{{margin:0;background:#101827;color:#f4f7fc;overflow:hidden;font-family:DemoSans,sans-serif}}#root{{position:relative;width:100%;height:100%;overflow:hidden}}.stage{{position:absolute;left:160px;top:82px;width:1600px;height:900px;overflow:hidden;background:#f5f7fb;border:1px solid #354156;border-radius:12px}}#world{{position:absolute;inset:0;transform-origin:50% 50%;will-change:transform}}#screen{{position:absolute;inset:0;width:1600px;height:900px;object-fit:contain}}.brand{{position:absolute;left:64px;top:18px;width:350px}}.brand strong{{font-size:27px;letter-spacing:-1px}}.brand small{{font-size:12px;letter-spacing:1.8px;display:block;color:#aabbd5;margin-top:5px}}.record-label{{position:absolute;right:64px;top:25px;color:#c3d1e6;font-size:13px;letter-spacing:1.1px}}.record-label i{{display:inline-block;width:7px;height:7px;background:#1f63ef;border-radius:50%;margin-right:8px}}.chapter{{position:absolute;left:485px;top:14px;width:1040px;height:63px}}.chapter-inner{{position:absolute;inset:0}}.chapter-title{{position:absolute;left:485px;top:14px;width:1040px;height:30px;margin:0;font-size:26px;font-weight:700;line-height:1.1;letter-spacing:-.4px}}.chapter-note{{position:absolute;left:485px;top:45px;width:1040px;height:23px;margin:0;font-size:16px;line-height:1.4;color:#b8c9e5;margin-top:0}}.chapter-rule{{position:absolute;left:485px;top:75px;width:150px;height:2px;background:#1f63ef;transform-origin:0% 50%}}.caption{{position:absolute;left:160px;top:994px;width:1600px;height:60px;display:flex;justify-content:center;align-items:center;text-align:center}}.caption{{font-size:26px;line-height:1.35;color:#f4f7fc;max-width:1580px}}.rail{{position:absolute;left:160px;top:1070px;width:1600px;height:4px;background:#26354c;overflow:hidden}}#progress{{width:100%;height:100%;background:#1f63ef;transform-origin:0% 50%}}.edge{{position:absolute;left:50px;top:180px;writing-mode:vertical-rl;font-size:12px;letter-spacing:2px;color:#91a6c8}}.endmark{{position:absolute;right:48px;bottom:185px;writing-mode:vertical-rl;font-size:12px;letter-spacing:2px;color:#91a6c8}}
</style></head><body><div id="root" data-composition-id="graphline-demo" data-start="0" data-duration="{total}" data-width="1920" data-height="1080"><div class="brand"><strong>GRAPHLINE</strong><small>AN(ti)INTERNS / GRAPH HACKS</small></div><div class="record-label"><i></i>RECORDED LOCAL DEMO</div><div class="edge">CONNECTED CONTEXT / TRACEABLE ACTIONS</div><div class="endmark">SYNTHETIC DATA / REAL GRAPH RECORDS</div><div class="stage"><div id="world" data-layout-allow-overflow><video id="screen" class="clip" src="assets/screen.mp4" data-start="0" data-duration="{total}" data-track-index="0" muted playsinline></video></div></div>{''.join(header)}{''.join(chunks)}{''.join(audio)}<div class="rail"><div id="progress"></div></div></div><script>const tl=gsap.timeline({{paused:true}});{''.join(anim)}window.__timelines['graphline-demo']=tl;</script></body></html>'''
(root/'index.html').write_text(source)
(root/'Graphline_Demo_Captions.srt').write_text('\n'.join(srt))
(root/'STORYBOARD.md').write_text('# Continuous browser walkthrough\n\nOne continuous recording is the visual source. Chapter labels and camera poses direct attention without replacing the application footage. Motion uses the viewport-change rule, with kicker/name/baseline entrances adapted from the lt-kicker-name registry block.\n\n'+'\n'.join(f'## Chapter {i+1}: {c["title"]}\n\nSource: continuous assets/screen.mp4, {c["start"]:.2f} to {c["start"]+c["duration"]:.2f} seconds.\n\n{c["text"]}\n' for i,c in enumerate(plan)))
print('Composition:',total,'seconds;',cid,'caption cues')
