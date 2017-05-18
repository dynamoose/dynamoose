

## Running Docs with Docker Image


```sh
docker run --rm --label=jekyll --volume=$(pwd):/srv/jekyll -it -p 127.0.0.1:4000:4000 jekyll/jekyll jekyll serve
```


## Building 

```sh
uglifyjs assets/js/vendor/jquery/jquery-1.12.4.min.js assets/js/vendor/tocbot.min.js assets/js/plugins/jquery.fitvids.js assets/js/plugins/jquery.greedy-navigation.js assets/js/plugins/jquery.magnific-popup.js assets/js/plugins/jquery.smooth-scroll.min.js  assets/js/_main.js -c -m -o assets/js/main.min.js
```