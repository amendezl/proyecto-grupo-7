const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
function listFiles(dir, exts){
  const out=[];
  (function walk(d){
    fs.readdirSync(d).forEach(f=>{
      const p=path.join(d,f);
      const s=fs.statSync(p);
      if(s.isDirectory()) return walk(p);
      if(exts.includes(path.extname(f))) out.push(p);
    })
  })(dir);
  return out;
}
function grepCount(term){
  try{
    const r=execSync(`git grep -n --fixed-strings "${term}" || true`,{encoding:'utf8'});
    if(!r) return 0;
    return r.split('\n').filter(Boolean).length;
  }catch(e){return 0}
}
const repoRoot = process.cwd();
const projDir = path.join(repoRoot,'proyecto','src');
const frontDir = path.join(repoRoot,'frontend','src');
let projFiles = [], frontFiles = [];
if(fs.existsSync(projDir)) projFiles = listFiles(projDir,['.js']);
if(fs.existsSync(frontDir)) frontFiles = listFiles(frontDir,['.js','.ts','.tsx','.jsx']);
const candidates=[];
[...projFiles,...frontFiles].forEach(f=>{
  const base = path.basename(f).replace(/\.(js|ts|tsx|jsx)$/,'');
  const count = grepCount(base);
  // ignore trivial matches in package.json or comments by threshold
  if(count<=1){
    candidates.push({file:path.relative(repoRoot,f),basename:base,refs:count});
  }
});
console.log('Potentially unreferenced files (heuristic):');
console.log(JSON.stringify(candidates,null,2));

// Also list explicit 'deprecated' or 'DEPRECATED' occurrences
try{
  const dep = execSync(`git grep -n -e deprecated -e DEPRECATED -e LEGACY -e legacy -- \"*\" || true`,{encoding:'utf8'});
  console.log('\nFiles with deprecation keywords:');
  console.log(dep);
}catch(e){console.log('\nNo deprecation keywords found via git grep.')}