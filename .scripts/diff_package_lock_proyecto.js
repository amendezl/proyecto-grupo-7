const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const repoRoot = process.cwd();
const lockPath = path.join(repoRoot,'proyecto','package-lock.json');
function loadCurrent(){
  if(!fs.existsSync(lockPath)) return null;
  return JSON.parse(fs.readFileSync(lockPath,'utf8'));
}
function loadHead(){
  try{
    const out = execSync('git show HEAD:proyecto/package-lock.json',{encoding:'utf8'});
    return JSON.parse(out);
  }catch(e){
    return null;
  }
}
const cur = loadCurrent();
const head = loadHead();
if(!cur){ console.error('Current lockfile not found'); process.exit(1); }
if(!head){ console.error('HEAD lockfile not found (maybe not committed previously)'); }
function flattenPackages(lock){
  const map = new Map();
  // Try both formats: lock.packages (npm v7+) or lock.dependencies
  if(lock.packages){
    for(const [pkgPath,info] of Object.entries(lock.packages)){
      if(info && info.version){
        // package key may be "node_modules/name" or "" for root
        const key = pkgPath || '<root>';
        map.set(key, info.version);
      }
    }
  }
  if(lock.dependencies){
    for(const [name,info] of Object.entries(lock.dependencies)){
      if(info && info.version){
        map.set(name, info.version);
      }
    }
  }
  return map;
}
const curMap = flattenPackages(cur);
const headMap = head? flattenPackages(head): new Map();
const changed = [];
for(const [key,version] of curMap.entries()){
  const old = headMap.get(key);
  if(old === undefined){
    changed.push({type:'added',key,version,old:null});
  }else if(old !== version){
    changed.push({type:'changed',key,version,old});
  }
}
for(const [key,oldVersion] of headMap.entries()){
  if(!curMap.has(key)) changed.push({type:'removed',key,old:oldVersion,version:null});
}
console.log(JSON.stringify(changed.filter(c=>c.type!=='removed'),null,2));
