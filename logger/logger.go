package logger

import (
	"fmt"
	"log"
)

func Debug(items ...interface{}) {
	msg := "DEBUG: " + fmt.Sprint(items...)
	log.Println(msg)
}

func Debugf(fmt string, items ...interface{}) {
	log.Printf("DEBUG: "+fmt, items...)
}

func Info(items ...interface{}) {
	msg := "INFO: " + fmt.Sprint(items...)
	log.Println(msg)
}

func Infof(fmt string, items ...interface{}) {
	log.Printf("INFO: "+fmt, items...)
}

func Error(items ...interface{}) {
	msg := "ERROR: " + fmt.Sprint(items...)
	log.Println(msg)
}

func Errorf(fmt string, items ...interface{}) {
	log.Printf("ERROR: "+fmt, items...)
}

func Panic(items ...interface{}) {
	msg := "PANIC: " + fmt.Sprint(items...)
	log.Panic(msg)
}

func Panicf(fmt string, items ...interface{}) {
	log.Panicf("PANIC: "+fmt, items...)
}
