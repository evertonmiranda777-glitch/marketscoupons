@echo off
cd /d "c:\Users\evert\Downloads\marketscoupons-repo"
set ONLY_FIRM=apex
node scripts\monitor-firms.js > .firecrawl\apex-daily-last.log 2>&1
