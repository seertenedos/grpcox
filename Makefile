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


build_all: build_linux build_darwin build_windows

build_linux:
	GOOS=linux GOARCH=amd64 go build -o ./build/linux_amd64/grpcox

build_darwin:
	GOOS=darwin GOARCH=amd64 go build -o ./build/darwin_amd64/grpcox

build_windows:
	GOOS=windows GOARCH=amd64 go build -o ./build/windows_amd64/grpcox.exe 
