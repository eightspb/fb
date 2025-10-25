import os
import urllib.request

urls = [
    "https://static.tildacdn.com/tild3033-3839-4538-a539-303765393065/image.png",
    "https://static.tildacdn.com/tild3036-3533-4332-b131-623463623563/image.png",
    "https://static.tildacdn.com/tild3333-3966-4539-a238-373939306530/image.png",
    "https://static.tildacdn.com/tild3435-3234-4237-b438-623231396163/image.png",
    "https://static.tildacdn.com/tild6636-3764-4364-b739-303462616532/image.png",
    "https://static.tildacdn.com/tild6166-3561-4332-b530-656362656230/image.png",
    "https://static.tildacdn.com/tild6135-3563-4863-a337-653064326631/image.png",
    "https://static.tildacdn.com/tild3239-6165-4233-b263-663261356534/image.png",
    "https://static.tildacdn.com/tild6133-3266-4336-a566-616138623761/image.png",
    "https://static.tildacdn.com/tild6566-3738-4066-b631-313866383664/image.png",
    "https://static.tildacdn.com/tild3163-3266-4835-a437-353237346433/image.png"
]

folder = r"c:\WORK_PROGRAMMING\fb.net\public\images\vab-steps"
os.makedirs(folder, exist_ok=True)

for i, url in enumerate(urls, 1):
    filename = os.path.join(folder, f"step-{i}.png")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"Downloaded step {i}")
    except Exception as e:
        print(f"Error downloading step {i}: {e}")

print("All images downloaded!")
