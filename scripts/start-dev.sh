#!/bin/bash
echo "🔄 Libération ports 3000,5173,5050"
kill -9 $(lsof -ti :3000) 2>/dev/null
kill -9 $(lsof -ti :5173) 2>/dev/null
kill -9 $(lsof -ti :5050) 2>/dev/null

echo "🚀 Backend..."
osascript -e 'tell app "Terminal" to do script "cd ~/GeoCollect/server && npm start"'
sleep 2
echo "🌐 Frontend..."
osascript -e 'tell app "Terminal" to do script "cd ~/GeoCollect/client && npm run dev"'
echo "✅ Done."
