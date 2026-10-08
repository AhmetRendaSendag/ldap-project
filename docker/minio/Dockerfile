FROM golang:1.25-alpine AS build

ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z

RUN apk add --no-cache git

WORKDIR /src
RUN git clone --depth 1 --branch ${MINIO_RELEASE} https://github.com/minio/minio.git .
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /minio .


FROM alpine:3.22

RUN apk add --no-cache ca-certificates curl

COPY --from=build /minio /usr/bin/minio

EXPOSE 9000 9001

ENTRYPOINT ["minio"]
