library(rmarkdown)

# generate the markdown file
render(input = "static_site.rmd",
       output_file = "index.html")