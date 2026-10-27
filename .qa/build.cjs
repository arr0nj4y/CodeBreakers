const fs=require('fs');
const helm=require('./helm/build-helm.cjs');
const pageFiles=require('./page-files.cjs');
const file='codebreakers_tripleA_cinematic_polish_v3.html';
let html=pageFiles.hydrate(fs.readFileSync(file,'utf8'));
if(!fs.existsSync('.qa/original.html'))fs.writeFileSync('.qa/original.html',html);
if(!fs.existsSync('.qa/pre-helm.html'))fs.writeFileSync('.qa/pre-helm.html',html);
const bootSection=/<section\b[^>]*\bid="bootScreen"[^>]*>[\s\S]*?<\/section>/;
if(!bootSection.test(html))throw new Error('Loading screen markup was not found.');
html=html.replace(bootSection,()=>fs.readFileSync('.qa/loading.html','utf8').trim());
html=html.replace(/\/\/ The loading sequence is a visual simulation, not a network request\.\r?\nshowScreen\('boot'\);[^\r\n]+/,
 "// Startup is coordinated by CBBoot after the interface and local assets are ready.\nshowScreen('boot');const bootTimer=null;");
// Keep the combat markup and controller editable without changing teacher hooks.
const combatSection=/<section\b[^>]*\bid="combatScreen"[^>]*>[\s\S]*?<\/section>/;
const combatEngine=/\/\* COMBAT ENGINE START \*\/[\s\S]*?\/\* COMBAT ENGINE END \*\/\s*|const problems=\[[\s\S]*?(?=const rosterKey=)/;
if(!combatSection.test(html)||!combatEngine.test(html))throw new Error('Combat source markers were not found.');
html=html.replace(combatSection,()=>fs.readFileSync('.qa/combat.html','utf8').trim());
html=html.replace(combatEngine,()=> '/* COMBAT ENGINE START */\n'+fs.readFileSync('.qa/combat.js','utf8')+'\n/* COMBAT ENGINE END */\n');
html=html.replace(/^<!DOCTYPE html>\s*<!DOCTYPE html>/i,'<!DOCTYPE html>');
html=html.replace(/\r?\n[ \t]*<!-- COMMAND DECK START -->[\s\S]*?<!-- COMMAND DECK END -->\r?\n/g,'\n');
html=html.replace(/\r?\n[ \t]*<!-- LEARNING EXPERIENCE START -->[\s\S]*?<!-- LEARNING EXPERIENCE END -->\r?\n/g,'\n');
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
const output=pageFiles.organize(html);
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
for(let i=0;i<scripts.length;i++)new(require('vm').Script)(scripts[i][1],{filename:'inline-'+i+'.js'});
fs.writeFileSync(pageFiles.stylesheet,output.css);
fs.writeFileSync(file,output.html);
console.log('Built HTML and CSS with War Table layer; parsed '+scripts.length+' inline scripts; '+(html.length/1048576).toFixed(2)+' MB.');
