package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/gusaul/grpcox/core"
	"github.com/gusaul/grpcox/handler"
)

var logFile = flag.String("logfile", "", "log file")

func main() {
	// logging conf
	flag.Parse()
	if logFile != nil && *logFile != "" {
		err := os.MkdirAll(filepath.Dir(*logFile), os.ModeDir|os.ModePerm)
		if err != nil {
			log.Fatalf("error creating dir: %v", err)
		}

		f, err := os.OpenFile(*logFile, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
		if err != nil {
			log.Fatalf("error opening file: %v", err)
		}
		defer f.Close()
		log.SetOutput(f)
	}

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// start app
	port := ":6969"
	muxRouter := mux.NewRouter()
	handler.Init(muxRouter)
	var wait time.Duration = time.Second * 15

	srv := &http.Server{
		Addr:         "0.0.0.0" + port,
		WriteTimeout: time.Second * 15,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Second * 60,
		Handler:      muxRouter,
	}

	fmt.Println("Service started on", "http://localhost"+port)
	go func() {
		log.Fatal(srv.ListenAndServe())
	}()

	c := make(chan os.Signal, 1)

	// We'll accept graceful shutdowns when quit via SIGINT (Ctrl+C)
	// SIGKILL, SIGQUIT or SIGTERM (Ctrl+/) will not be caught.
	signal.Notify(c, os.Interrupt)

	// Block until we receive our signal.
	<-c

	// Create a deadline to wait for.
	ctx, cancel := context.WithTimeout(context.Background(), wait)
	defer cancel()

	err := removeProtos()
	if err != nil {
		log.Printf("error while removing protos: %s", err.Error())
	}

	srv.Shutdown(ctx)
	log.Println("shutting down")
	os.Exit(0)
}

// removeProtos will remove all uploaded proto file
// this function will be called as the server shutdown gracefully
func removeProtos() error {
	log.Println("removing proto dir from /tmp")
	err := os.RemoveAll(core.BasePath)
	return err
}
