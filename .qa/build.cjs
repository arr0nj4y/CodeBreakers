const fs=require('fs');
const helm=require('./helm/build-helm.cjs');
const file='codebreakers_tripleA_cinematic_polish_v3.html';
let html=fs.readFileSync(file,'utf8');
if(!fs.existsSync('.qa/original.html'))fs.writeFileSync('.qa/original.html',html);
if(!fs.existsSync('.qa/pre-helm.html'))fs.writeFileSync('.qa/pre-helm.html',html);
html=html.replace(/^<!DOCTYPE html>\s*<!DOCTYPE html>/i,'<!DOCTYPE html>');
html=html.replace(/\n<!-- COMMAND DECK START -->[\s\S]*?<!-- COMMAND DECK END -->\n/g,'\n');
html=html.replace(/\n<!-- LEARNING EXPERIENCE START -->[\s\S]*?<!-- LEARNING EXPERIENCE END -->\n/g,'\n');
html=html.replace(/\n?<!-- HELM START -->[\s\S]*?<!-- HELM END -->\n?/g,'\n');
if(fs.existsSync('.qa/learning.js')){
 html=html.replace('arcade:studentArcadeProgress(),exportedAt:', 'arcade:studentArcadeProgress(),learning:window.CBLearning?.exportEvidence(),exportedAt:');
 html=html.replace('arcade:cleanArcade(r.arcade),exportedAt:', 'arcade:cleanArcade(r.arcade),learning:window.CBLearning?.cleanReport(r.learning),exportedAt:');
 if(!html.includes("window.dispatchEvent(new Event('cb-teacher-refresh'))"))html=html.replace(/function renderTeacher\(\)\{\r?\n/,"function renderTeacher(){\nwindow.dispatchEvent(new Event('cb-teacher-refresh'));\n");
 html=html.replace("e.target.matches('input,select,button')","e.target.matches('input,select,button,textarea')||e.target.isContentEditable");
}
// The War Table layer (.qa/helm) replaces every earlier presentation layer, including the command deck.
html=helm.patchCore(helm.strip(html));
let block='';
if(fs.existsSync('.qa/learning.js'))block+='\n<!-- LEARNING EXPERIENCE START -->\n'+['learning-language','learning-evidence','learning'].map(name=>'<script id="'+name+'">\n'+fs.readFileSync('.qa/'+name+'.js','utf8')+'\n</script>').join('\n')+'\n<!-- LEARNING EXPERIENCE END -->\n';
html=html.replace(/<\/body>\s*<\/html>\s*$/i,block+'</body></html>\n');
html=helm.inject(html);
fs.writeFileSync(file,html);
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
for(let i=0;i<scripts.length;i++)new(require('vm').Script)(scripts[i][1],{filename:'inline-'+i+'.js'});
console.log('Built War Table layer; parsed '+scripts.length+' inline scripts; '+(html.length/1048576).toFixed(2)+' MB.');
