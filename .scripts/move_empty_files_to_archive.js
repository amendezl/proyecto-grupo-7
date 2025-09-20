const fs = require('fs');
const path = require('path');
function walk(dir, files=[]) {
  fs.readdirSync(dir).forEach(name=>{
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) return walk(p, files);
    files.push({path: p, size: stat.size});
  });
  return files;
}
const repoRoot = process.cwd();
const files = walk(repoRoot);
const empty = files.filter(f=>f.size===0).map(f=>f.path);
if(empty.length===0){
  console.log('No empty files found');
  process.exit(0);
}
const now = new Date().toISOString().replace(/[:.]/g,'-');
const archiveRoot = path.join(repoRoot, '.archive', `empty-files-${now}`);
empty.forEach(fullPath=>{
  const rel = path.relative(repoRoot, fullPath);
  const dest = path.join(archiveRoot, rel);
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  try{
    fs.renameSync(fullPath, dest);
    console.log(`Moved: ${rel}`);
  }catch(e){
    console.error(`Failed to move ${rel}:`, e.message);
  }
});
console.log(`Archived ${empty.length} files to ${archiveRoot}`);
