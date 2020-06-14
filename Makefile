usage: FORCE
	exit 1

FORCE:

include config.env
export $(shell sed 's/=.*//' config.env)

start: FORCE
	@echo " >> building..."
	@mkdir -p log
	@go build
	@./grpcox

bindata:
	go-bindata -fs -pkg handler -prefix "index/" -o handler/site.go index/...
